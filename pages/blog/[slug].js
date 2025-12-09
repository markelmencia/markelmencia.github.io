import React from "react"
import fs from "fs"
import matter from "gray-matter"
import md from "markdown-it"
import Header from "@/components/Header";
import Head from "next/head"

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

    return {props: {
        frontMatter, content
    }}
}

function Blog({frontMatter, content}) {

    return <div>
        <Head>
            <title>{`${frontMatter.title} - Markel Mencía`}</title>
        </Head>
        <Header />
        <article className="prose dark:prose-invert prose-lg prose-a:var(--theme) max-w-none article-border" dangerouslySetInnerHTML={{__html: md().render(content)}}/>
    </div>
}

export default Blog