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
            <h1>ForgeLetter Resources</h1>
            <p>
              Practical guides and frameworks for writing stronger cover
              letters and running a sharper job search.
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
