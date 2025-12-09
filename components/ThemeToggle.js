"use client"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import Image from "next/image"

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, systemTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div style={{width: 45, height: 45}} />
  }

  const currentTheme = theme === "system" ? systemTheme : theme

  function switchMode() {
    setTheme(currentTheme === "dark" ? "light" : "dark")
  }

  return (
    <Image 
      onClick={switchMode} 
      className="change-mode" 
      src={currentTheme === "dark" ? "/img/moon.svg" : "/img/sun.svg"} 
      alt="Toggle theme" 
      width={45} 
      height={45}
    />
  )
}