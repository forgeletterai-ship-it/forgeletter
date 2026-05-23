/**
 * Tests covering the schema-not-yet-migrated path. When the
 * persistenceAvailable prop is false, the empty-state copy must
 * shift to explain why no experiences are showing — not blame the
 * user for not adding any.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ExperienceMultiSelect } from "@/components/ExperienceMultiSelect"

afterEach(() => cleanup())

describe("ExperienceMultiSelect — persistence-disabled state", () => {
  it("shows the migration-pending message when persistenceAvailable=false", async () => {
    render(
      <ExperienceMultiSelect
        blocks={[]}
        selectedIds={[]}
        onChange={vi.fn()}
        persistenceAvailable={false}
      />
    )

    await userEvent.click(screen.getByRole("button"))

    // Migration-pending copy (not the generic "No saved experiences yet")
    expect(screen.getByText(/Experience storage not enabled/i)).toBeInTheDocument()
    expect(screen.getByText(/migration/i)).toBeInTheDocument()
    expect(
      screen.getByText(/docs\/supabase-experience-blocks\.sql/)
    ).toBeInTheDocument()

    // Link text differs from the default
    expect(
      screen.getByRole("link", { name: /Open profile/i })
    ).toBeInTheDocument()

    // Forced "Qualifications & achievements" row is still there
    expect(screen.getByText("Qualifications & achievements")).toBeInTheDocument()
  })

  it("shows the default 'no saved experiences yet' message when persistenceAvailable defaults to true", async () => {
    render(
      <ExperienceMultiSelect blocks={[]} selectedIds={[]} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole("button"))

    expect(screen.getByText("No saved experiences yet")).toBeInTheDocument()
    expect(screen.queryByText(/Experience storage not enabled/i)).not.toBeInTheDocument()
  })
})
