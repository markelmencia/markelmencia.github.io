    import React from "react"
    import fs from "fs"
    import matter from "gray-matter"
    import md from "markdown-it"
    import Header from "@/components/Header"
    import Head from "next/head"
    import { remark } from 'remark'
    import remarkRehype from 'remark-rehype'
    import rehypePrism from 'rehype-prism-plus'
    import rehypeStringify from 'rehype-stringify'
import RSSComponent from "@/components/RSSComponent"

    export async function getStaticPaths() {
        const files = fs.readdirSync("posts")
        const paths = files.map((filename) => ({
            params: {
                slug: filename.replace(".md", "")
            }
        }))

        return {
            paths, fallback: false
        }
    }

    export async function getStaticProps({params: {slug}}) {
        const markdown =  fs.readFileSync(`posts/${slug}.md`)
        const {data: frontMatter, content} = matter(markdown)

        const remarkContent = await remark().use(remarkRehype).use(rehypePrism, { showLineNumbers: true }).use(rehypeStringify).process(content)

        const contentString = remarkContent.toString()

        return {props: {
            frontMatter, contentString
        }}
    }

    function Blog({frontMatter, contentString}) {

        return <div>
            <Head>
                <title>{`${frontMatter.title} - Markel Mencía`}</title>
                <meta property="og:title" content={`${frontMatter.title} - Markel Mencía`}/>
                <meta property="og:description" content={`${frontMatter.description}`}/>
                <meta property="og:type" content="website"/>
                <meta property="og:url" content={`https://markelmencia.github.io/blog/${frontMatter.slug}`} />
                <meta property="og:image" content="https://markelmencia.github.io/img/logo.png"/>
                <meta property="article:published_time" content={frontMatter.date} />
            </Head>
            <Header />
            <article className="prose dark:prose-invert prose-lg prose-a:var(--theme) max-w-none article-border" dangerouslySetInnerHTML={{__html: contentString}}/>
            <div style={{marginBottom: "20px"}}>
                <RSSComponent/>
            </div>
        </div>
    }

    export default Blog