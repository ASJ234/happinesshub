import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Service — HAPPYPORN.COM" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="16 November 2026">
      <section>
        <h2>1. Adults only</h2>
        <p>
          This website contains sexually explicit material. You may only use it
          if you are at least 18 years old and adult content is legal where you
          live. By entering, you confirm both.
        </p>
      </section>
      <section>
        <h2>2. Your account</h2>
        <p>
          Keep your login details private. You are responsible for everything
          done with your account. We may suspend accounts that break these terms.
        </p>
      </section>
      <section>
        <h2>3. Content you upload</h2>
        <ul>
          <li>Everyone shown must be 18 or older and must have consented to being filmed and published.</li>
          <li>You must own the content or have the right to publish it.</li>
          <li>No content involving minors, non-consent, violence or anything illegal.</li>
        </ul>
        <p className="mt-2">
          We review uploads and listings and may remove anything at any time.
          Illegal content is reported to the authorities.
        </p>
      </section>
      <section>
        <h2>4. Subscriptions and payments</h2>
        <p>
          Subscriptions unlock paid content for the period of the plan you
          choose and do not renew automatically. Payments are processed by our
          mobile money provider. Gift credit is spent on live streams and is not
          refundable.
        </p>
      </section>
      <section>
        <h2>5. Changes</h2>
        <p>
          We may update these terms. Continuing to use the site means you accept
          the current version.
        </p>
      </section>
    </LegalPage>
  );
}
