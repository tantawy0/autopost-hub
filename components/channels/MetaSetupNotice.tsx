import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

const FALLBACK_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003";
const FALLBACK_REDIRECT_URI = `${FALLBACK_APP_URL.replace(/\/+$/, "")}/api/meta/callback`;
const REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
];

export type MetaDiagnosticsView = {
  setup: {
    redirectUri: string;
    expectedRedirectUri: string;
    redirectMatchesAppUrl: boolean;
    graphVersion: string;
    readyForPublishing: boolean;
    scopes: {
      required: string[];
      configured: string[];
      missing: string[];
    };
  };
  summary: {
    facebookConnections: number;
    instagramConnections: number;
    publishReadyFacebook: number;
    publishReadyInstagram: number;
    pagesWithoutInstagram: number;
  };
};

interface MetaSetupNoticeProps {
  diagnostics?: MetaDiagnosticsView | null;
}

export default function MetaSetupNotice({ diagnostics }: MetaSetupNoticeProps) {
  const setup = diagnostics?.setup;
  const redirectUri = setup?.redirectUri ?? FALLBACK_REDIRECT_URI;
  const scopes = setup?.scopes.required ?? REQUIRED_SCOPES;
  const missingScopes = setup?.scopes.missing ?? [];
  const hasSetupWarning =
    setup && (!setup.readyForPublishing || !setup.redirectMatchesAppUrl || missingScopes.length > 0);

  return (
    <section className="rounded-lg border border-amber-300/20 bg-amber-300/8 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-amber-100">
            <AlertTriangle size={18} aria-hidden="true" />
            Meta setup and diagnostics
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
            If Meta connection shows URL Blocked or Invalid Scopes, the app settings in Meta Dashboard
            are missing the redirect URL, required permissions, or the Instagram account is not linked
            to an eligible Facebook Page.
          </p>
        </div>
        <a
          href="https://developers.facebook.com/apps/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/8 px-4 text-sm font-black text-white hover:bg-white/12"
        >
          Open Meta Apps
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-lg border border-white/10 bg-zinc-950/40 p-4">
          <p className="text-xs font-black uppercase text-zinc-500">Valid OAuth Redirect URI</p>
          <code className="mt-2 block break-all rounded-md bg-black/30 p-3 text-xs font-semibold text-emerald-200">
            {redirectUri}
          </code>
          {setup && !setup.redirectMatchesAppUrl ? (
            <p className="mt-2 text-xs font-semibold text-amber-100">
              Expected for this app URL: {setup.expectedRedirectUri}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-950/40 p-4">
          <p className="text-xs font-black uppercase text-zinc-500">Permissions to enable/request</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {scopes.map((scope) => (
              <span
                key={scope}
                className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 text-xs font-bold text-zinc-200"
              >
                <CheckCircle2
                  size={14}
                  className={missingScopes.includes(scope) ? "text-amber-300" : "text-emerald-300"}
                  aria-hidden="true"
                />
                {scope}
              </span>
            ))}
          </div>
        </div>
      </div>

      {hasSetupWarning ? (
        <div className="mt-4 rounded-lg border border-amber-200/15 bg-black/20 p-4 text-sm leading-6 text-amber-50">
          {missingScopes.length > 0 ? (
            <p>Missing scopes in `META_SCOPES`: {missingScopes.join(", ")}</p>
          ) : null}
          {!setup.redirectMatchesAppUrl ? (
            <p>Meta redirect URI must exactly match the app URL callback above.</p>
          ) : null}
          {diagnostics.summary.pagesWithoutInstagram > 0 ? (
            <p>
              {diagnostics.summary.pagesWithoutInstagram} connected Facebook Page
              {diagnostics.summary.pagesWithoutInstagram === 1 ? " is" : "s are"} missing a linked
              Instagram Business/Creator account.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
