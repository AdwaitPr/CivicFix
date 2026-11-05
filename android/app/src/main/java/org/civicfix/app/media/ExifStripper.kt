package org.civicfix.app.media

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import kotlin.math.max

object ExifStripper {

    fun sanitizeAndCompress(context: Context, uri: Uri): File {
        val inputStream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalArgumentException("Cannot open Uri stream")
        val tempInput = File.createTempFile("raw_image_", ".jpg", context.cacheDir)
        FileOutputStream(tempInput).use { out -> inputStream.copyTo(out) }
        inputStream.close()

        val outputFile = File.createTempFile("sanitized_", ".webp", context.cacheDir)
        return processImageFile(tempInput, outputFile)
    }

    fun processImageFile(inputFile: File, outputFile: File): File {
        // 1. Read EXIF orientation before stripping
        var rotationDegrees = 0
        try {
            val exif = ExifInterface(inputFile.absolutePath)
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            rotationDegrees = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90
                ExifInterface.ORIENTATION_ROTATE_180 -> 180
                ExifInterface.ORIENTATION_ROTATE_270 -> 270
                else -> 0
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 2. Decode bitmap with bounds check
        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeFile(inputFile.absolutePath, options)

        val maxDim = 1920
        var sampleSize = 1
        val origMax = max(options.outWidth, options.outHeight)
        while (origMax / sampleSize > maxDim) {
            sampleSize *= 2
        }

        val decodeOptions = BitmapFactory.Options().apply {
            inSampleSize = sampleSize
        }
        var bitmap = BitmapFactory.decodeFile(inputFile.absolutePath, decodeOptions)
            ?: throw IllegalStateException("Failed to decode image bitmap")

        // 3. Rotate bitmap if needed
        if (rotationDegrees != 0) {
            val matrix = Matrix().apply { postRotate(rotationDegrees.toFloat()) }
            bitmap = Bitmap.createBitmap(
                bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true
            )
        }

        // 4. Compress to WebP / JPEG without EXIF tags
        var quality = 85
        val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Bitmap.CompressFormat.WEBP_LOSSY
        } else {
            Bitmap.CompressFormat.JPEG
        }

        val maxFileSizeBytes = 5 * 1024 * 1024 // 5 MB limit
        var stream = ByteArrayOutputStream()
        bitmap.compress(format, quality, stream)

        while (stream.size() > maxFileSizeBytes && quality > 20) {
            quality -= 15
            stream = ByteArrayOutputStream()
            bitmap.compress(format, quality, stream)
        }

        FileOutputStream(outputFile).use { out ->
            out.write(stream.toByteArray())
        }

        // Clean up raw file
        inputFile.delete()

        return outputFile
    }

    fun fileToBase64(file: File): String {
        val bytes = file.readBytes()
        val mimeType = if (file.name.endsWith(".webp", ignoreCase = true)) "image/webp" else "image/jpeg"
        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        return "data:$mimeType;base64,$base64"
    }
}
