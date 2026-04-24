import Link from "next/link"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"
import { resourceArticles } from "@/lib/resources"

export default function BlogPage() {
  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <section className="page-hero">
          <div className="container">
            <span className="section-kicker">Resources</span>
            <h1>LetterForge resource library.</h1>
            <p>
              Practical guidance for stronger applications, cleaner profile
              data, and professional workflows for future career-agency
              partners.
            </p>
          </div>
        </section>
        <section className="container article-grid">
          {resourceArticles.map((article) => (
            <Link className="article-card" href={`/blog/${article.slug}`} key={article.slug}>
              <span className="section-kicker">{article.category}</span>
              <h2>{article.title}</h2>
              <p>{article.summary}</p>
              <small>{article.readingTime}</small>
            </Link>
          ))}
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
