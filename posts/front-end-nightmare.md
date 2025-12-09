---
title: "First post: Front-end nightmare"
date: "2025-12-05"
description: "High-end development is an area I'm not as used to as other lower-level areas. Still, I decided to make my own static website from scratch, using frameworks as a complete beginner. In this post I'll talk about my experience with it so far, and the lessons I've learned along the way."
---

# First post: Front-end nightmare

#### December 5, 2025

I have always liked system-level development better. It is what I've grown to like and hopefully what I'll keep enjoying in the future. I'm just more comfortable with low-level programming, even though admittedly, more often than not, some concepts can be anything but intuitive.

Regardless, sometimes I do dabble into higher-level environments for a change, especially recently because some university projects demanded so. It's something I can definitely enjoy. In a recent hackathon I participated in, I ended up designing a webapp. At that time I had no experience with JavaScript whatsoever, and learning it, albeit confusing, was quite fun.

More recently, I decided to try to build my own page from scratch, as a sort of portfolio, and a place where I could write about whatever I felt like. Usually, to build a page like that, you'd resort to the countless free-to-use [Hexo](https://hexo.io/)/[Hugo](https://themes.gohugo.io/) templates available; they're easy to set up, nice to the eye, and they let you minimize your concerns about the design side of developing a blog. They even allow you to write articles in Markdown (like this one I'm currently writing), which makes it very easy to post, even for people not accustomed to coding. I had used templates like these before, and I have no issue with them. In fact, I highly recommend their use. Nevertheless, I wanted to try something new: frameworks. 

By all means, it was hard.

## Choosing a framework
It's a common gag in the front-end development community to say that one of the most difficult parts of developing an application is choosing a proper framework for it. And of course, I got to experience that in my own way.

At first sight, one could claim that choosing a framework for my necessities (a static page with some features to ease the creation of posts) wouldn't be hard, and they'd probably be correct. But for me, it was not easy at all.

### Vite-SSG + Vue
Bold first choice, especially considering the fact that the first time I used Vue was that very same day. I chose [Vite-SSG](https://github.com/antfu-collective/vite-ssg) because it was light and it used Vue. I had learned the basics of Vue that very same day for an assignment, and this framework seemed like a perfect excuse to dive deeper into that framework. Futhermore, it was specialized for server-side generation pages (hence SSG), which is another name for static pages. However, I couldn't even get it running. For reasons unknown to me, the build always failed. I followed many guides that used different methods and none worked, most likely because of me. After an hour and a half of failed attempts, I gave up and went home. Needless to say, I had a lot to learn.

### Nuxt.js
This framework seemed promising for me. It looked very well documented and from what I can gather, it's performance is remarkable. [Nuxt.js](https://nuxt.com/) is a bigger framework than the previous one, but it also works with Vue. Again, lured by my willingness to learn Vue, I gave it a test. This time, I had more success in the setup process. The build was working, and I even began making some small designs to get more accustomed to Vue.

The problems started coming up when I began to implement Markdown support to the page, which is essential to what I was trying to do. It took a bunch of tinkering, but I managed to make it work: Text written in Markdown format would be translated to HTML, but there was one issue. The library I used for it only translated the format, but it had no style. That was expected, because for Markdown styling the [tailwind/typography](https://tailwindcss.com/blog/tailwindcss-typography) library is used generally. Essentially, it provides "proses", which are predefined styles that format the text for you. Here's where everything went to waste, because again, I was unable to set it up. I'll speak more on this later.

## The struggle of front-end vs back-end development
Empty-handed again, desperation was starting to kick in, and not in small doses! I can manage dealing with errors just fine, but only if I know where they come from. In development closer to the system-level, you can always debug more and more until you inevitably stumble across the issue. With front-end development, that might not always be the case, because there's more to it than just your code. 

### Abstraction
Abstraction is one part of it. For obvious reasons frameworks provide abstraction so that you don't need to worry about the intricacies of the lower-level side when you don't need to. However, I find that debugging becomes more challenging with abstraction because you don't necessarily know what's happening under the hood. This is why I'm often reluctant to big frameworks like [Django](https://www.djangoproject.com/). I acknowledge that they're powerful tools that can make you save time, but purely because of preference I rather use lighter frameworks that allow me to understand what happens under the hood better, with the price of having to write more code or having less abstraction.

### Version control and compatibility
I have realized very quickly that the version you're running your framework on really does make or break it. Frameworks are in constant development, and making sure everything is updated or compatible with other libraries is not trivial, as it seems.

I wasn't at all accustomed to these factors, and it showed. I want to make clear that the reason I dropped the previously mentioned frameworks was not because they weren't useful for me or because I thought they just weren't good. I just wasn't able to make them work because I wasn't ready. Additionally, the guides I was following were probably out of date. In lower-level areas, sometimes this might not matter, because the development of these areas tends to be more stable and long-term oriented. But in the ever-changing world of frameworks, this is definitely a thing to look out for.

## Next.js
Back again on the drawing board, I remembered that a friend specialized in web development told me that Next.js is one of the general go-tos in the framework world. Countless tutorials exist for it and it's very well documented. With no other ideas, I tried it out. I followed a [very good tutorial](https://m.youtube.com/watch?v=kffGWfZCLlE&pp=ygUjaG93IHRvIGNyZWF0ZSBhIGJsb2cgd2l0aCBtYXJrZG93biA%3D) that covered just enough to have what I needed, allowing me to take it from there. And, sure enough, after dealing with Tailwind versions for a second time, I finally got it working! 

## Where I'm at
After two whole days of aimlessly tinkering for hours, I finally have the base for my page. I'm writing this after having finished the setup, so the truth is that I'm just getting started. Usually, the complicated part in web development is the design of the page, not the setup. The good news is that I have more experience in this area, so hopefully I'll pull through. My idea is to make a basic blog design, like the ones you'd see in [Hexo](https://hexo.io/) or [Hugo](https://themes.gohugo.io/), so nothing too fancy or complicated. Hopefully I'll make something decent!

## What I've learned
Although there's some things I yet don't understand (and I'm far from being out of the woods), I do feel like I've learned quite a bit.

Firstly, I can wholeheartedly say that dealing with the issues I found was very frustrating and something I wasn't at all ready for. I thought that the setup of a framework wouldn't be too difficult because the npm package manager has gone a long way and it definitely has made things easier over the years. But again, conflicting versions and different flavours of packages twisted my environments. In retrospect, I should've spent some more time making sure the versions of the libraries I was using were compatible with each other, which brings me to the next lesson.

I've also learned that knowing how to document yourself is one of, if not the most important skill to learn if you want to work with frameworks. Usually, this is a given for Computer Science in general, but I feel like this area in particular is the one in which this shows the most, because frameworks are in constant development, and standards and practices change because of it. Additionally, frameworks create a lot of files, many of which you don't even need to open. Generally I can handle projects with many source files, but only if I know what they do. To give some credit to frameworks, however, Nuxt does [a really good job](https://nuxt.com/docs/4.x/directory-structure) of documenting what each file does, and how their project structure works, and those articles helped for sure. 

## Technicality

Finally, I've also experienced first-hand that front-end development is far from trivial, something I knew already but hadn't experienced. There seems to be people that believe that front-end design is not development, or that it requires less skills than other programming areas. I couldn't agree less with that. It requires thought and good decision-making, you need to be aware of the tools available and know which is best for your use cases. And this isn't taking into account all the design involved in the web development process: not only do you need to have an idea of what you want to create but you also have to know how to code it. It is true that it is a very accessible field, with lots of options and ways to learn. But developing a full-fledged web application still requires to be very aware of those tools. And let's not even mention SEO and placement! There are many variables in web development, and these need to be properly addressed if you want a good overall project. I believe that an area being less technical than other doesn't imply that it's an easier area to work on. It definitely requires a different mindset, but that doesn't mean that you'll have an easier time with it. 

Sometimes, it is important to remember that. As someone who is more interested in research and in the more technical aspects of Computer Science, it's easy to get too caught up on the idea that you're in the cutting-edge of what we know about this field, and thinking that other areas less involved in that are "simpler" because of it. The truth is that they just require a different a skillset or motivation. One that a researcher, system administrator or Linux kernel developer might not have. And that's alright! The fun thing about Computer Science is that you'll never be able to grasp the full view. It's just that big of a field.

Anyway, I will continue developing my page. There's a lot to do but I'm excited to see where it ends up. My idea, as I mentioned, is to build a portfolio to showcase my projects. But I especially want to make this page to post articles about whatever I feel like writing, because it's a hobby I quite like. Designing everything myself is clearly an overkill? Absolutely, but we'll see where it ends up!

~ Markel

