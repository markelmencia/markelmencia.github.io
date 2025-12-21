import Link from "next/link"

export default function PostDescription({title, date, desc, slug, type}) {
  return (
    <div className="post-desc">
         <Link href={`/${type}/${slug}`}>
              <div className="desc-text">
                <p className="desc-date">{date}</p>
               <h1 className="desc-title">{title}</h1>
               <p className="desc-desc">{desc}</p>
          </div>
            </Link>
    </div>
  )
}