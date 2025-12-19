import ThemeToggle from "@/components/ThemeToggle"
import Image from 'next/image'
import Link from "next/link"

export default function Header() {
  return (
    <nav>
      <ul className="page-nav">
        <Link href={"/"}><li className="nav-item"><Image src="/img/logo.png" alt="Logo" width={50} height={50}></Image></li></Link>
        <Link className="nav-item" href={"/projects/"}><li>Projects</li></Link>
        <Link className="nav-item" href={"/blog/"}><li>Blogs</li></Link>
        <ThemeToggle />
        </ul>    
    </nav>
  )
}