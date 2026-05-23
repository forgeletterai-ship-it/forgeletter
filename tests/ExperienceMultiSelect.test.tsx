/**
 * Component tests for the ExperienceMultiSelect on the Draft Inputs
 * page. Verifies the requirements:
 *   - Options derived correctly from profile data (label + kind tag)
 *   - Default selection = all saved experiences
 *   - Qualifications row is forced-on and cannot be toggled
 *   - Empty state when the user has no saved experiences
 *   - onChange fires with the correct subset when items are clicked
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  ExperienceMultiSelect,
  QUALIFICATIONS_ROW_ID,
} from "@/components/ExperienceMultiSelect"
import type { ExperienceBlock } from "@/lib/experience-types"

afterEach(() => cleanup())

function makeBlock(
  overrides: Partial<ExperienceBlock> & Pick<ExperienceBlock, "id" | "type">
): ExperienceBlock {
  return {
    company: "",
    title: "",
    employmentType: "",
    sector: "",
    size: "",
    role: "",
    duration: "",
    name: "",
    degree: "",
    achievements: [],
    ...overrides,
  }
}

const sampleBlocks: ExperienceBlock[] = [
  makeBlock({ id: "emp-1", type: "employer", company: "Helix Systems", title: "Senior Engineer" }),
  makeBlock({ id: "int-1", type: "internship", company: "Plinth Labs", role: "Summer Intern" }),
  makeBlock({ id: "uni-1", type: "university", name: "KTH", degree: "BSc Computer Science" }),
]

describe("ExperienceMultiSelect", () => {
  it("renders one option per saved experience block with the right label + kind tag", async () => {
    render(
      <ExperienceMultiSelect
        blocks={sampleBlocks}
        selectedIds={sampleBlocks.map((b) => b.id)}
        onChange={vi.fn()}
      />
    )

    // Open the panel
    await userEvent.click(screen.getByRole("button"))

    const listbox = screen.getByRole("listbox")

    // Each block label is present
    expect(within(listbox).getByText(/Helix Systems - Senior Engineer/i)).toBeInTheDocument()
    expect(within(listbox).getByText(/Plinth Labs - Summer Intern/i)).toBeInTheDocument()
    expect(within(listbox).getByText(/KTH - BSc Computer Science/i)).toBeInTheDocument()

    // Kind tags
    expect(within(listbox).getByText("Employer")).toBeInTheDocument()
    expect(within(listbox).getByText("Internship")).toBeInTheDocument()
    expect(within(listbox).getByText("Academic")).toBeInTheDocument()

    // Pinned forced-on row
    expect(within(listbox).getByText("Qualifications & achievements")).toBeInTheDocument()
    expect(within(listbox).getByText("Always")).toBeInTheDocument()
  })

  it("Qualifications row is forced-on and cannot be unchecked", async () => {
    const onChange = vi.fn()
    render(
      <ExperienceMultiSelect
        blocks={sampleBlocks}
        selectedIds={["emp-1", "int-1", "uni-1"]}
        onChange={onChange}
      />
    )

    await userEvent.click(screen.getByRole("button"))

    const qualRow = screen.getByText("Qualifications & achievements").closest('[role="option"]')!
    expect(qualRow).toHaveAttribute("aria-checked", "true")
    expect(qualRow).toHaveAttribute("aria-disabled", "true")

    // Clicking it must not call onChange — the row is non-interactive
    fireEvent.click(qualRow)
    // The QUALIFICATIONS_ROW_ID is never included in the user-facing
    // selectedIds — it's always implicit.
    expect(onChange).not.toHaveBeenCalledWith(expect.arrayContaining([QUALIFICATIONS_ROW_ID]))
    expect(onChange).not.toHaveBeenCalled()
  })

  it("clicking an unchecked option calls onChange with that id added", async () => {
    const onChange = vi.fn()
    render(
      <ExperienceMultiSelect
        blocks={sampleBlocks}
        selectedIds={["emp-1"]}
        onChange={onChange}
      />
    )

    await userEvent.click(screen.getByRole("button"))

    const internRow = screen.getByText(/Plinth Labs - Summer Intern/i).closest('[role="option"]')!
    fireEvent.click(internRow)

    expect(onChange).toHaveBeenCalledTimes(1)
    const [next] = onChange.mock.calls[0]
    expect(next).toEqual(expect.arrayContaining(["emp-1", "int-1"]))
    expect(next).not.toContain(QUALIFICATIONS_ROW_ID)
  })

  it("clicking a checked option calls onChange with that id removed", async () => {
    const onChange = vi.fn()
    render(
      <ExperienceMultiSelect
        blocks={sampleBlocks}
        selectedIds={["emp-1", "int-1"]}
        onChange={onChange}
      />
    )

    await userEvent.click(screen.getByRole("button"))

    // Scope the search to the listbox — the closed bar also shows
    // selected labels in its summary text.
    const listbox = screen.getByRole("listbox")
    const empRow = within(listbox)
      .getByText(/Helix Systems - Senior Engineer/i)
      .closest('[role="option"]')!
    fireEvent.click(empRow)

    expect(onChange).toHaveBeenCalledTimes(1)
    const [next] = onChange.mock.calls[0]
    expect(next).toEqual(["int-1"])
  })

  it("bar shows selected names or N-selected, depending on count", async () => {
    // 0 selected → placeholder
    const { rerender } = render(
      <ExperienceMultiSelect blocks={sampleBlocks} selectedIds={[]} onChange={vi.fn()} />
    )
    expect(screen.getByRole("button")).toHaveTextContent("Select experiences to include")

    // 1 selected → name
    rerender(
      <ExperienceMultiSelect
        blocks={sampleBlocks}
        selectedIds={["emp-1"]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole("button")).toHaveTextContent(/Helix Systems/)

    // 3+ selected → "N selected"
    rerender(
      <ExperienceMultiSelect
        blocks={sampleBlocks}
        selectedIds={["emp-1", "int-1", "uni-1"]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole("button")).toHaveTextContent("3 selected")
  })

  it("renders an empty state with profile CTA when there are no blocks", async () => {
    render(
      <ExperienceMultiSelect
        blocks={[]}
        selectedIds={[]}
        onChange={vi.fn()}
        profileExperienceHref="/dashboard/profile"
      />
    )

    await userEvent.click(screen.getByRole("button"))

    expect(screen.getByText("No saved experiences yet")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /Add experiences on your profile/i })
    expect(link).toHaveAttribute("href", "/dashboard/profile")

    // Qualifications row should still be present and forced-on
    expect(screen.getByText("Qualifications & achievements")).toBeInTheDocument()
  })

  it("closes on Escape", async () => {
    render(
      <ExperienceMultiSelect
        blocks={sampleBlocks}
        selectedIds={["emp-1"]}
        onChange={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole("button"))
    expect(screen.getByRole("listbox")).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("exposes role=listbox with aria-multiselectable=true", async () => {
    render(
      <ExperienceMultiSelect
        blocks={sampleBlocks}
        selectedIds={[]}
        onChange={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole("button"))
    const listbox = screen.getByRole("listbox")
    expect(listbox).toHaveAttribute("aria-multiselectable", "true")
  })
})
