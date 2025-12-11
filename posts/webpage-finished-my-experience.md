---
title: "Website finished: My experience overall"

date: "2025-12-11"

description: "My page is now finished, for now at least. In this article I speak about my experience with the design process, and what I think about the final product."
---

# Webpage finished: My experience overall  

#### December 11, 2025

After a long weekend of spending a considerable amount of hours designing, I've finally finished my page and deployed it!

As I've mentioned [in my last post](/blog/front-end-nightmare), I've been meaning to create a personal portfolio/blog. Using a template was not something I was intending to do this time, so I decided to create the page from scratch, by myself. This led to a handful of roadblocks and desperation, but after a few attempts, I managed to get the foundations of the page working. With that out of the way, I started the actual designing process, which is what I'll be talking about today.

## Working with Next.js
After struggling with two other frameworks, Next.js was the one I managed to get working. In retrospect, most of my issues arose when trying to implement [tailwind/typography](https://tailwindcss.com/blog/tailwindcss-typography), so I could've stayed in the other two frameworks I dropped. Still, working with Next.js was alright and I didn't run into many complicated issues. I've been told that Next.js is a bit of an overkill for a static page, but it worked for me. At the end of the day, performance is not exactly a priority in a static page. I focused more on readability and related issues.

The component system was very intuitive and I got the hang of it pretty quickly. I'm pretty sure the components are more of a React feature, though? I'll still mention it here because quite frankly I don't know any better. Creating dynamic pages (in my case for each blog) was very simple as well, it's one of the first things I set up, and after doing so, I didn't have to think about them any more during the rest of the design process.

Overall, I'm satisfied with Next.js. I'm happy I got to learn the fundamentals of a framework this popular. Honestly, I don't know when or if I'll have the change to use it for a different project, but if I do, at least I'll be able to know where to start.

## Dealing with Tailwind
After all the struggles I've had with getting Typography to work, once installed, Tailwind turned out to be very easy to work with. And not only that, but it does the work it advertises pretty well. Out of the box, after configuring it to work on my articles,  the styles it applies definitely makes the text more readable. I only had to change a few things to adapt it to my page design, so it was definitely worth the struggle. I've been told that Markdown design is not easy at all. With Tailwind, I didn't really need to worry about it much.

However, I'm technically not done with it. Something I haven't configured yet are codeblocks. I currently haven't written any post with code on it, so I've forgotten about them entirely. Once I need to write some code on my blog, I'll try to set it up correctly, I hope it isn't much trouble.

## The more-complicated features
As it can be seen, my page is far from complex, but if I had to highlight what has been the hardest features to implement, I'd say the search bar and the dark mode.

### The search bar
In the blog section, you can search blogs with the search bar. I wanted to implement this from the very beginning because I find it quite useful, and I wanted to dabble into more complex JavaScript. In the end, I actually got it working quite quickly, although it's important to mention that search bars are pretty well-documented, and finding information about them online wasn't too much of a chore.

### Dark/light mode
This actually gave me a bunch of issues! I think my mistake was trying to do it in a CSS/JavaScript-centric approach first. I had already implemented a dark/light mode switcher for other projects with no frameworks, so I wasn't aware that there were tools for this in Next.js. After lots of attempts (and the browser cache trolling me once or twice), it works? It even changes according to your system theme, but I invite you to find the issue with it!

## The design itself
When looking at the design, it's clear that I've inspired myself in the classic blog template design. This is because I didn't need much more than that, I wasn't looking for anything fancy. I think that for this page, I'm focusing on readability, so the less distractions there are for reading, the better. So after tinkering with different options, and the help of one of my friends with the specifics (thank you Litzy), I've managed to build something I'm quite satisfied with, and from scratch! That was my objective from the very beginning. Hopefully I've found a balance between simplicity and enough details for the page to be appealing.

This is all from me for now. Semester finals are next week, so I don't know if I'll have much time to write more, but after that I'll surely have some more time to work on personal projects. Christmas is right around the corner! December always passes by so quickly, so I'll try to make the most of it.

~ Markel


