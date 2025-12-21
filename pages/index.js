import Header from "@/components/Header";
import Head from "next/head"
import Image from 'next/image'
import Link from "next/link"
import fs from "fs"
import matter from "gray-matter"
import PostDescription from "@/components/PostDescription";
import RSSComponent from "@/components/RSSComponent";


export async function getStaticProps() {
  const blogFiles = fs.readdirSync("posts")
  const blogs = blogFiles.map((filename) => {
    const slug = filename.replace(".md", "")
    const readFiles = fs.readFileSync(`posts/${filename}`)
    const {data: frontMatter} = matter(readFiles)
    
    return {
      slug, frontMatter, type: "blog"
    }
  })

  const writeupFiles = fs.readdirSync("writeups")
  const writeups = writeupFiles.map((filename) => {
    const slug = filename.replace(".md", "")
    const readFiles = fs.readFileSync(`writeups/${filename}`, "utf-8")
    const {data: frontMatter} = matter(readFiles)
    return {
      slug, frontMatter, type: "writeups"
    }
  })

  const allPosts = [...blogs, ...writeups]

  const sorted = allPosts.sort((a, b) => {
    return new Date(b.frontMatter.date) - new Date(a.frontMatter.date)
  })

  return {
    props: {
      recent_posts: sorted.slice(0, 3)
    }
  }
}

export default function Home({recent_posts}) {
  return (
    <main>
      <Head>
        <title>Home - Markel Mencía</title>
        <meta property="og:title" content="Markel Mencía"/>
        <meta property="og:description" content="Computer Engineering undergraduate interested in system-level development and cybersecurity."/>
        <meta property="og:type" content="website"/>
        <meta property="og:url" content="https://markelmencia.github.io"/>
        <meta property="og:image" content="https://markelmencia.github.io/img/logo.png"/>
      </Head>
      <Header/>
      <div className="info">
        <h1 className="name-title"><span className="hello">Hello! </span> I'm Markel</h1>
        <hr className="separator"/>
        <p className="subtitle  mb-4">Computer Engineering undergraduate</p>
        <p>Welcome to my page. I'm a third year Computer Science student, mainly interested in system-level research/development and cybersecurity. This page serves as a showcase of some of the work I've done over the years. It's also a blog, in which I write about whatever I feel like from time to time, so feel free to read!</p>
        <span className="profile-logos">
          <Link href="https://github.com/markelmencia" target="_blank"><Image className="profile-logo" src="/img/github.svg" alt="Github" width={25} height={25}></Image></Link>
          <Link href="mailto:markel.mnc@gmail.com" target="_blank"><Image className="profile-logo" src="/img/email.svg" alt="Email" width={30} height={30}></Image></Link>
        </span>
      </div>
      <h1 className="page-title">Recent posts</h1>
      <RSSComponent/>
      {recent_posts.map((post) => {
                  return (
                    <PostDescription key={post.slug} title={post.frontMatter.title} date={post.frontMatter.date} slug={post.slug} desc={post.frontMatter.description} type={post.type}
                    />
                  )
                })}
    </main>
  );
}
