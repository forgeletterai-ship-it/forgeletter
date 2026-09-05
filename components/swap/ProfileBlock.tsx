"use client"

import { PROFILE_COPY, REDUCED_CONFIDENCE_SUFFIX } from "@/lib/swap/templates"
import type { Profile, ProfileConfidence } from "@/lib/swap/types"

/** Result beat 5 — the profile, verbatim Appendix B copy, with the
 *  reduced-confidence line appended when no JD was supplied. */
export default function ProfileBlock({
  profile,
  confidence,
}: {
  profile: Profile
  confidence: ProfileConfidence
}) {
  const copy = PROFILE_COPY[profile]
  return (
    <div className="swap-block swap-profile">
      <h3>The read</h3>
      <h4>{copy.headline}</h4>
      <p>{copy.body}</p>
      {copy.beforeYouRewrite ? (
        <p>
          <strong>{copy.beforeYouRewrite}</strong>
        </p>
      ) : null}
      {confidence === "reduced" ? (
        <p className="swap-reduced">{REDUCED_CONFIDENCE_SUFFIX}</p>
      ) : null}
    </div>
  )
}
