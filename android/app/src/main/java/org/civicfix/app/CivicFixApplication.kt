package org.civicfix.app

import android.app.Application
import org.osmdroid.config.Configuration

class CivicFixApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize OsmDroid User-Agent
        Configuration.getInstance().userAgentValue = "CivicFix-Android/1.0"
    }
}
