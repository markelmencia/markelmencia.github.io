import Header from "@/components/Header"
import Head from "next/head"
import fs from 'fs'
import path from 'path'
import Link from "next/link"

export async function getStaticProps() {
  const projectsFile = path.join(process.cwd(), 'projects.json')
  const projectsJSONData = fs.readFileSync(projectsFile, 'utf-8')
  const projects = JSON.parse(projectsJSONData)

  const wipFile = path.join(process.cwd(), 'wip.json')
  const wipJSONData = fs.readFileSync(wipFile, 'utf-8')
  const wip = JSON.parse(wipJSONData)
  
  return {
    props: {
      projects: projects,
      wip: wip
    }
  }
}

export default function Projects({projects, wip}) {
  return (
    <main>
      <Head>
        <title>Projects - Markel Mencía</title>
      </Head>
      <Header/>
        <h1 className="page-title">Projects</h1>
        <div className="project-grid">
          {projects.map(project => (
            <Link key={project.name} href={project.link} target="_blank">
          <div className="project">
            {project.tools.map((tool) => (
                <span key={tool} className="tool">
                  {tool}
                </span>
              ))}
            <h1 className="project-name">{project.name}</h1>
            <p>{project.description}</p>
          </div>
           </Link>
      ))}
        </div>

        <h1 className="page-title">Work in progress</h1>
        <div className="project-grid">
          {wip.map(wip => (
            <Link key={wip.name} href={wip.link} target="_blank">
          <div className="project">
            {wip.tools.map((tool) => (
                <span key={tool} className="tool">
                  {tool}
                </span>
              ))}
            <h1 className="project-name">{wip.name}</h1>
            <p>{wip.description}</p>
          </div>
           </Link>
      ))}
        </div>
       
    </main>
  );
}
