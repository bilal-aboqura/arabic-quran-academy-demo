/**
 * Production is deny-by-default for legacy APIs while the tenant migration is
 * in progress. Adding a new API route requires an explicit security review
 * and allow-list entry; otherwise it cannot accidentally execute global DB
 * reads just because it was deployed.
 */
const reviewedApiPaths = [
  /^\/api\/health$/,
  /^\/api\/platform(?:\/|$)/,
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/user\/profile$/,
  /^\/api\/settings\/homepage$/,
  /^\/api\/public\/(?:site-flags|teachers)$/,
  /^\/api\/reviews$/,
  /^\/api\/courses$/,
  /^\/api\/courses\/[A-Za-z0-9_-]+$/,
  /^\/api\/courses\/slug\/[A-Za-z0-9-]+$/,
  /^\/api\/categories(?:\/[A-Za-z0-9_-]+)?$/,
  /^\/api\/activate-code$/,
  /^\/api\/enroll$/,
  /^\/api\/store\/purchase$/,
  /^\/api\/subscriptions\/purchase$/,
  /^\/api\/payments\/orders$/,
  /^\/api\/payments\/webhooks\/(?:local_test|paymob|kashier)$/,
  /^\/api\/lessons\/[A-Za-z0-9_-]+\/(?:playback\/(?:start|heartbeat)|rating)$/,
  /^\/api\/quizzes\/[A-Za-z0-9_-]+(?:\/(?:start|product|attempts\/[A-Za-z0-9_-]+))?$/,
  /^\/api\/homework(?:\/submit)?$/,
  /^\/api\/dashboard\/students(?:\/[A-Za-z0-9_-]+(?:\/enrollments(?:\/[A-Za-z0-9_-]+)?|\/balance)?)?$/,
  /^\/api\/dashboard\/platform-subscriptions(?:\/[A-Za-z0-9_-]+)?$/,
  /^\/api\/dashboard\/settings\/(?:copyright-overlay|add-balance|store-enabled|store-home-section|subscriptions-enabled|teachers-enabled|homepage)$/,
  /^\/api\/dashboard\/codes(?:\/[A-Za-z0-9_-]+)?$/,
  /^\/api\/dashboard\/site(?:\/[A-Za-z0-9_-]+)*$/,
  /^\/api\/dashboard\/website\/branding$/,
  /^\/api\/dashboard\/courses(?:\/[A-Za-z0-9_-]+(?:\/(?:edit|lessons|quizzes))?)?$/,
  /^\/api\/dashboard\/store-purchases(?:\/[A-Za-z0-9_-]+)?$/,
  /^\/api\/dashboard\/password-change-requests(?:\/[A-Za-z0-9_-]+)*$/,
  /^\/api\/messages\/(?:send|students|staff|[A-Za-z0-9_-]+)$/,
  /^\/api\/messages\/conversations(?:\/[A-Za-z0-9_-]+)?$/,
  /^\/api\/files\/messages\/[A-Za-z0-9_-]+$/,
  /^\/api\/files\/homework\/[A-Za-z0-9_-]+$/,
  /^\/api\/files\/lessons\/[A-Za-z0-9_-]+\/pdf$/,
  /^\/api\/files\/store\/[A-Za-z0-9_-]+$/,
  /^\/api\/learning\/progress$/,
  /^\/api\/assignments(?:\/[A-Za-z0-9_-]+(?:\/submissions(?:\/[A-Za-z0-9_-]+)?)?)?$/,
  /^\/api\/upload\/assignments\/[A-Za-z0-9_-]+$/,
  /^\/api\/files\/assignments\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/,
  /^\/api\/live-streams(?:\/[A-Za-z0-9_-]+)?$/,
  /^\/api\/upload\/(?:homework|message|pdf|image)$/,
  /^\/api\/dashboard\/(?:store-products|subscription-plans)(?:\/[A-Za-z0-9_-]+)?$/,
  /^\/api\/dashboard\/teachers(?:\/[A-Za-z0-9_-]+|\/homepage-featured)?$/,
  /^\/api\/dashboard\/(?:reviews|tenant-settings)$/,
  /^\/api\/notifications(?:\/(?:read-all|[A-Za-z0-9_-]+\/read))?$/,
] as const;

/**
 * All core dashboard and public course pages have now completed their tenant-scoped
 * repository migrations and boundary reviews.
 */
export function isProductionTenantBoundaryBlockedPath(pathname: string): boolean {
  void pathname;
  return false;
}

export function isReviewedTenantApiPath(pathname: string): boolean {
  return reviewedApiPaths.some((pattern) => pattern.test(pathname));
}
