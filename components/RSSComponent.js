import Link from "next/link"

export default function RSSComponent() {
  return (
    <div className="rss">
      <Link href={"/rss.xml"}>(Blog RSS)</Link>
    </div>
  )
}