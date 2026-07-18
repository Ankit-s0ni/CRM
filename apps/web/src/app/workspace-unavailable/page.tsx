import Link from "next/link";

function messageForCode(code: string | undefined, workspace?: string) {
  switch (code) {
    case "WORKSPACE_NOT_FOUND":
      return {
        title: "This workspace is unavailable",
        body: workspace
          ? `We couldn't find ${workspace}.hrmsapp.com. The subdomain might be incorrect, or the account has been temporarily suspended due to a billing issue.`
          : "We couldn't find the workspace you're looking for. The subdomain might be incorrect, or the account has been temporarily suspended due to a billing issue.",
        errorCode: "WORKSPACE_NOT_FOUND",
      };
    case "TENANT_SUSPENDED":
    default:
      return {
        title: "This workspace is unavailable",
        body: workspace
          ? `We couldn't find the workspace you're looking for. ${workspace}.hrmsapp.com might be temporarily unavailable due to a billing issue.`
          : "We couldn't find the workspace you're looking for. The subdomain might be incorrect, or the account has been temporarily suspended due to a billing issue.",
        errorCode: "TENANT_SUSPENDED",
      };
  }
}

export default async function WorkspaceUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; workspace?: string }>;
}) {
  const { code, workspace } = await searchParams;
  const content = messageForCode(code, workspace);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#fcf8ff] px-6 py-6">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[#3525cd]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-[#7cf994]/10 blur-[150px]" />
      </div>

      <main className="relative z-10 flex w-full max-w-[600px] flex-col items-center text-center">
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-[#3525cd]">hub</span>
            <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-[#1b1b24]">DeltCRM</h1>
          </div>
        </div>

        <div className="relative mb-8 aspect-video w-full max-w-[420px]">
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[12px] border border-[#c7c4d8]/30 bg-gradient-to-tr from-[#eae6f4] to-[#f5f2ff] shadow-sm">
            <div className="relative flex h-[288px] w-[192px] flex-col items-center justify-center rounded-t-[8px] border-x-4 border-t-4 border-[#e4e1ee] bg-white px-4 py-4 shadow-xl">
              <div className="mb-auto mt-4 h-1 w-full bg-[#e4e1ee]" />

              <div className="floating mb-4 rounded-full bg-[#ffdad6] p-4">
                <span
                  className="material-symbols-outlined text-[48px] text-[#ba1a1a]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lock
                </span>
              </div>

              <div className="mb-2 h-1 w-12 bg-[#e4e1ee]" />
              <div className="h-1 w-8 bg-[#e4e1ee]" />
              <div className="absolute right-4 top-1/2 h-6 w-6 rounded-full border-4 border-white bg-[#e4e1ee] shadow-inner" />
            </div>

            <div className="absolute left-12 top-12 flex rotate-[-6deg] items-center gap-1 rounded-[8px] border border-[#c7c4d8]/20 bg-white/80 px-2 py-2 shadow-sm backdrop-blur">
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">warning</span>
              <span className="text-[12px] font-semibold leading-4 text-[#464555]">404</span>
            </div>

            <div className="absolute bottom-16 right-8 flex rotate-[12deg] items-center gap-1 rounded-[8px] border border-[#c7c4d8]/20 bg-white/80 px-2 py-2 shadow-sm backdrop-blur">
              <span className="material-symbols-outlined text-[18px] text-[#3525cd]">credit_card_off</span>
              <span className="text-[12px] font-semibold leading-4 text-[#464555]">Billing</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-[30px] font-bold leading-[38px] tracking-[-0.02em] text-[#1b1b24]">{content.title}</h2>
          <p className="px-4 text-[18px] leading-7 text-[#464555]">{content.body}</p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            className="group relative flex items-center gap-2 rounded-[12px] bg-[#3525cd] px-8 py-4 text-[14px] font-medium leading-5 text-white shadow-md shadow-[#3525cd]/20 transition-all duration-300 hover:bg-[#4f46e5] active:scale-95"
            href="mailto:support@indigohr.com"
          >
            <span className="material-symbols-outlined">support_agent</span>
            Contact support
          </Link>
          <Link
            className="rounded-[12px] border-2 border-[#3525cd]/20 bg-transparent px-8 py-4 text-[14px] font-medium leading-5 text-[#3525cd] transition-all duration-300 hover:bg-[#3525cd]/5 active:scale-95"
            href="/"
          >
            Go to main site
          </Link>
        </div>

        <div className="mt-16">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#eae6f4] px-4 py-2">
            <span className="material-symbols-outlined text-[16px] text-[#464555]">info</span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#464555]">
              Error code: {content.errorCode}
            </span>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mt-auto py-6 text-center">
        <p className="text-[14px] leading-5 text-[#777587]">DeltCRM workspace services</p>
      </footer>
    </div>
  );
}
