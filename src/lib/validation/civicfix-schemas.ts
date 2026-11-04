import { z } from "zod";
import { sanitizePlainText } from "../security/sanitization";
import { REPORT_STATUS_VALUES, ReportStatus } from "../domain/types";

export { sanitizePlainText };
export { REPORT_STATUS_VALUES };

export const CreateReportSchema = z
  .object({
    title: z
      .string()
      .transform(sanitizePlainText)
      .pipe(
        z
          .string()
          .min(5, "Issue title must be at least 5 characters.")
          .max(140, "Issue title cannot exceed 140 characters.")
      ),
    categoryId: z.string().uuid("Invalid issue category identifier."),
    description: z
      .string()
      .transform(sanitizePlainText)
      .pipe(
        z
          .string()
          .min(15, "Description must provide at least 15 characters of detail.")
          .max(4000, "Description cannot exceed 4,000 characters.")
      ),
    latitude: z
      .number()
      .min(-90, "Latitude must be between -90 and 90.")
      .max(90, "Latitude must be between -90 and 90."),
    longitude: z
      .number()
      .min(-180, "Longitude must be between -180 and 180.")
      .max(180, "Longitude must be between -180 and 180."),
    approximateAddress: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizePlainText(val) : undefined)),
    isLocationFuzzed: z.boolean().default(false),
    acceptedNonAffiliationDisclaimer: z.literal(true, {
      errorMap: () => ({
        message:
          "Submission requires acknowledging that CivicFix is an independent tracking platform and does not automatically dispatch reports to municipal authorities.",
      }),
    }),
  })
  .refine(
    (data) => !(Math.abs(data.latitude) < 0.0001 && Math.abs(data.longitude) < 0.0001),
    {
      message: "Invalid coordinates (0, 0 Null Island rejected). Select a valid map location.",
      path: ["latitude"],
    }
  );

export type CreateReportInput = z.infer<typeof CreateReportSchema>;

export const BoundingBoxQuerySchema = z.object({
  west: z.coerce.number().min(-180).max(180),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  north: z.coerce.number().min(-90).max(90),
  categorySlug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  status: z.enum(REPORT_STATUS_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(250).optional(),
});

export type BoundingBoxQueryParams = z.infer<typeof BoundingBoxQuerySchema>;

export const AdminStatusTransitionSchema = z.object({
  newStatus: z.enum(REPORT_STATUS_VALUES),
  publicRationale: z
    .string()
    .transform(sanitizePlainText)
    .pipe(z.string().min(5, "Public rationale must be at least 5 characters.").max(1000)),
  internalAdminNote: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizePlainText(v) : undefined)),
  canonicalReportId: z.string().uuid().optional(),
});

export type AdminStatusTransitionInput = z.infer<typeof AdminStatusTransitionSchema>;

export const CreateReportFlagSchema = z.object({
  reportId: z.string().uuid(),
  matchedReportId: z.string().uuid().optional(),
  reason: z.enum([
    "potential_duplicate",
    "spam",
    "abusive_or_harassment",
    "privacy_or_pii",
    "false_allegation",
    "inaccurate_location",
    "malicious_media",
  ]),
  details: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizePlainText(v) : undefined)),
});

export const ModerationActionSchema = z.object({
  reportId: z.string().uuid(),
  flagId: z.string().uuid().optional(),
  actionType: z.enum([
    "flag_dismissed",
    "marked_duplicate",
    "report_hidden",
    "report_restored",
    "media_redacted",
    "pii_scrubbed",
    "user_warned",
  ]),
  actionNotes: z
    .string()
    .transform(sanitizePlainText)
    .pipe(z.string().min(3, "Action notes must be at least 3 characters.").max(1000)),
  canonicalReportId: z.string().uuid().optional(),
});
