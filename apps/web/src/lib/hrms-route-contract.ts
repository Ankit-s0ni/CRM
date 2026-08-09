export const HRMS_ROOT = "/app/hrms";
export const HRMS_ATTENDANCE_ROOT = `${HRMS_ROOT}/attendance`;
export const HRMS_PAYROLL_ROOT = `${HRMS_ROOT}/payroll`;
export const HRMS_UNAUTHORIZED_PATH = `${HRMS_ROOT}/unauthorized`;
export const HRMS_SUBSCRIPTION_REQUIRED_PATH = `${HRMS_ROOT}/subscription-required`;
export const HRMS_UNAVAILABLE_PATH = `${HRMS_ROOT}/unavailable`;

export function hrmsAccessStatePathForCode(code?: string | null) {
  switch (code) {
    case "PRODUCT_NOT_ENTITLED":
    case "CAPABILITY_NOT_ENTITLED":
    case "SUBSCRIPTION_INACTIVE":
      return HRMS_SUBSCRIPTION_REQUIRED_PATH;
    case "PRODUCT_UNAVAILABLE":
    case "PRODUCT_PROVISIONING":
    case "SERVICE_UNAVAILABLE":
      return HRMS_UNAVAILABLE_PATH;
    case "FORBIDDEN":
    case "INSUFFICIENT_PERMISSION":
    case "PRODUCT_PERMISSION_DENIED":
    case "UNAUTHORIZED":
      return HRMS_UNAUTHORIZED_PATH;
    default:
      return null;
  }
}
