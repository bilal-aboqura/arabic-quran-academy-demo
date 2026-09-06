import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const httpUrlSchema = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "https:" || protocol === "http:";
}, "Only http(s) URLs are allowed");
const socialLinksSchema = z.record(z.string().max(32), httpUrlSchema).optional();
const nullableAssetUrl = z.string().trim().max(2000).refine((value) => value.startsWith("/") || httpUrlSchema.safeParse(value).success, "Invalid asset URL").nullable();

export const tenantSettingsPatchSchema = z.object({
  platformName: z.string().trim().min(1).max(160).optional(),
  platformNameEn: z.string().trim().max(160).nullable().optional(),
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  secondaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  logoUrl: nullableAssetUrl.optional(),
  faviconUrl: nullableAssetUrl.optional(),
  heroImageUrl: nullableAssetUrl.optional(),
  fontPreference: z.enum(["Cairo", "Tajawal", "Alexandria", "Noto Kufi Arabic", "Changa"]).nullable().optional(),
  shortAbout: z.string().trim().max(4000).nullable().optional(),
  seoTitle: z.string().trim().max(160).nullable().optional(),
  seoDescription: z.string().trim().max(500).nullable().optional(),
  defaultLocale: z.enum(["ar", "en"]).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
  socialLinks: socialLinksSchema,
  contactDetails: z.record(z.string(), z.unknown()).optional(),
}).strict();

export async function getTenantSettingsForAdmin(tenantId: string) {
  return prisma.tenantSettings.findUnique({ where: { tenantId } });
}

export async function updateTenantSettingsForAdmin(tenantId: string, input: z.infer<typeof tenantSettingsPatchSchema>) {
  const { contactDetails, ...rest } = input;
  const payload = {
    ...rest,
    ...(contactDetails !== undefined ? { contactDetails: contactDetails as Prisma.InputJsonValue } : {}),
  };
  return prisma.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...payload },
    update: payload,
  });
}

export const addBalanceSettingsSchema = z.object({
  addBalanceTitle: z.string().trim().max(160).optional(),
  addBalanceTitleEn: z.string().trim().max(160).optional(),
  addBalanceSubtitle: z.string().trim().max(300).optional(),
  addBalanceSubtitleEn: z.string().trim().max(300).optional(),
  addBalanceMethodTitle: z.string().trim().max(160).optional(),
  addBalanceMethodTitleEn: z.string().trim().max(160).optional(),
  addBalanceTransferInstruction: z.string().trim().max(500).optional(),
  addBalanceTransferInstructionEn: z.string().trim().max(500).optional(),
  addBalanceWalletNumber: z.string().trim().max(64).optional(),
  addBalanceConfirmationNote: z.string().trim().max(500).optional(),
  addBalanceConfirmationNoteEn: z.string().trim().max(500).optional(),
  addBalanceWhatsappNumber: z.string().trim().max(64).optional(),
  addBalanceWhatsappButtonText: z.string().trim().max(160).optional(),
  addBalanceWhatsappButtonTextEn: z.string().trim().max(160).optional(),
  addBalanceWaitingNote: z.string().trim().max(500).optional(),
  addBalanceWaitingNoteEn: z.string().trim().max(500).optional(),
});

export type AddBalanceSettings = z.infer<typeof addBalanceSettingsSchema>;

export async function getTenantAddBalanceSettings(tenantId: string): Promise<AddBalanceSettings> {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { contactDetails: true },
  });
  const details = (settings?.contactDetails as Record<string, unknown> | null) ?? {};
  const ab = (details.addBalance as Record<string, unknown> | null) ?? {};
  return {
    addBalanceTitle: typeof ab.addBalanceTitle === "string" ? ab.addBalanceTitle : "",
    addBalanceTitleEn: typeof ab.addBalanceTitleEn === "string" ? ab.addBalanceTitleEn : "",
    addBalanceSubtitle: typeof ab.addBalanceSubtitle === "string" ? ab.addBalanceSubtitle : "",
    addBalanceSubtitleEn: typeof ab.addBalanceSubtitleEn === "string" ? ab.addBalanceSubtitleEn : "",
    addBalanceMethodTitle: typeof ab.addBalanceMethodTitle === "string" ? ab.addBalanceMethodTitle : "",
    addBalanceMethodTitleEn: typeof ab.addBalanceMethodTitleEn === "string" ? ab.addBalanceMethodTitleEn : "",
    addBalanceTransferInstruction: typeof ab.addBalanceTransferInstruction === "string" ? ab.addBalanceTransferInstruction : "",
    addBalanceTransferInstructionEn: typeof ab.addBalanceTransferInstructionEn === "string" ? ab.addBalanceTransferInstructionEn : "",
    addBalanceWalletNumber: typeof ab.addBalanceWalletNumber === "string" ? ab.addBalanceWalletNumber : "",
    addBalanceConfirmationNote: typeof ab.addBalanceConfirmationNote === "string" ? ab.addBalanceConfirmationNote : "",
    addBalanceConfirmationNoteEn: typeof ab.addBalanceConfirmationNoteEn === "string" ? ab.addBalanceConfirmationNoteEn : "",
    addBalanceWhatsappNumber: typeof ab.addBalanceWhatsappNumber === "string" ? ab.addBalanceWhatsappNumber : "",
    addBalanceWhatsappButtonText: typeof ab.addBalanceWhatsappButtonText === "string" ? ab.addBalanceWhatsappButtonText : "",
    addBalanceWhatsappButtonTextEn: typeof ab.addBalanceWhatsappButtonTextEn === "string" ? ab.addBalanceWhatsappButtonTextEn : "",
    addBalanceWaitingNote: typeof ab.addBalanceWaitingNote === "string" ? ab.addBalanceWaitingNote : "",
    addBalanceWaitingNoteEn: typeof ab.addBalanceWaitingNoteEn === "string" ? ab.addBalanceWaitingNoteEn : "",
  };
}

export async function updateTenantAddBalanceSettings(tenantId: string, input: AddBalanceSettings) {
  const current = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { contactDetails: true },
  });
  const currentDetails = (current?.contactDetails as Record<string, unknown> | null) ?? {};
  const updatedDetails = {
    ...currentDetails,
    addBalance: {
      ...((currentDetails.addBalance as Record<string, unknown> | null) ?? {}),
      ...input,
    },
  };
  return prisma.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, contactDetails: updatedDetails as Prisma.InputJsonValue },
    update: { contactDetails: updatedDetails as Prisma.InputJsonValue },
  });
}

export async function getTenantCopyrightOverlayStyle(tenantId: string): Promise<"floating" | "watermark"> {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { contactDetails: true },
  });
  const details = (settings?.contactDetails as Record<string, unknown> | null) ?? {};
  return details.copyrightOverlayStyle === "watermark" ? "watermark" : "floating";
}

export async function updateTenantCopyrightOverlayStyle(tenantId: string, style: "floating" | "watermark") {
  const current = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { contactDetails: true },
  });
  const currentDetails = (current?.contactDetails as Record<string, unknown> | null) ?? {};
  const updatedDetails = {
    ...currentDetails,
    copyrightOverlayStyle: style === "watermark" ? "watermark" : "floating",
  };
  return prisma.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, contactDetails: updatedDetails as Prisma.InputJsonValue },
    update: { contactDetails: updatedDetails as Prisma.InputJsonValue },
  });
}
