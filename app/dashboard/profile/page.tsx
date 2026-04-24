export default function ProfilePage() {
  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">Profile</span>
          <h1>Your reusable application context.</h1>
          <p>
            Store the experience details that every future generator call should
            understand.
          </p>
        </div>
      </div>

      <section className="dashboard-card">
        <form className="form-stack">
          <div className="field">
            <label htmlFor="headline">Professional headline</label>
            <input id="headline" placeholder="Growth marketer with SaaS and lifecycle experience" />
          </div>
          <div className="field">
            <label htmlFor="achievements">Key achievements</label>
            <textarea
              id="achievements"
              placeholder="Add 3-5 measurable wins. Example: improved onboarding conversion by 18%."
            />
          </div>
          <div className="field">
            <label htmlFor="strengths">Strengths and skills</label>
            <textarea
              id="strengths"
              placeholder="List the skills, tools, industries, and working style you want reflected."
            />
          </div>
          <button className="button-soft" type="button">
            Save profile soon
          </button>
        </form>
      </section>
    </>
  )
}
