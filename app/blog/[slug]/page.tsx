import Link from "next/link"
import { notFound } from "next/navigation"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"
import { getArticle, resourceArticles } from "@/lib/resources"

type ArticlePageProps = {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return resourceArticles.map((article) => ({ slug: article.slug }))
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = getArticle(slug)

  if (!article) notFound()

  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <article className="article-page">
          <div className="container">
            <Link className="button-ghost" href="/blog">
              Back to resources
            </Link>
            <span className="section-kicker">{article.category}</span>
            <h1>{article.title}</h1>
            <p>{article.summary}</p>
            <small>{article.readingTime}</small>
            <div className="article-body">
              {article.sections.map((section) => (
                <section key={section.title}>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </section>
              ))}
            </div>
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  )
}
