import React from "react"
import fs from "fs"
import matter from "gray-matter"
import Header from "@/components/Header"
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import rehypePrism from 'rehype-prism-plus'
import rehypeStringify from 'rehype-stringify'
import RSSComponent from "@/components/RSSComponent"
import CustomHead from "@/components/CustomHead"
import { ArticleSchema } from "@/components/JSON-LD"

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
            <CustomHead
                title={frontMatter.title}
                description={frontMatter.description}
                canonical={`https://markelmencia.com/blog/${frontMatter.slug}`}
                ogType="article"
                publishedTime={frontMatter.date}
            />
            <ArticleSchema />
            <Header />
            <article className="prose dark:prose-invert prose-lg prose-a:var(--theme) max-w-none article-border" dangerouslySetInnerHTML={{__html: contentString}}/>
            <div style={{marginBottom: "20px"}}>
                <RSSComponent/>
            </div>
        </div>
    }

    export default Blog