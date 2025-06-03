"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import Image from "next/image"

export function MarketingNavbar() {
	const [isScrolled, setIsScrolled] = useState(false)

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20)
		}
		window.addEventListener("scroll", handleScroll)
		return () => window.removeEventListener("scroll", handleScroll)
	}, [])

	return (
		<header
			className={`w-full fixed top-0 z-50 px-4 sm:px-6 py-3 transition-all duration-300 ease-in-out ${
				isScrolled
					? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-md"
					: "bg-transparent"
			}`}
		>
			<div className="max-w-7xl mx-auto flex justify-between items-center">
				<Link href="/marketing" className="flex items-center gap-2">
					<Image
						src={
							isScrolled
								? "/images/Logo/forgefit-logo-orange.svg"
								: "/images/Logo/forgefit-logo-white.svg"
						}
						alt="ForgeFit Logo"
						width={150} // Set width to 150px
						height={40} // Maintaining aspect ratio, adjust height accordingly or remove for auto-scaling if image is SVG and styled with CSS for height.
					/>
				</Link>
				<nav className="hidden md:flex items-center gap-6 text-sm font-medium">
					<Link
						href="/marketing#features"
						className={`${
							isScrolled
								? "text-slate-700 dark:text-slate-300"
								: "text-slate-200"
						} hover:text-primary dark:hover:text-primary`}
					>
						Features
					</Link>
					<Link
						href="/marketing#pricing"
						className={`${
							isScrolled
								? "text-slate-700 dark:text-slate-300"
								: "text-slate-200"
						} hover:text-primary dark:hover:text-primary`}
					>
						Pricing
					</Link>
					<Link
						href="/marketing#about"
						className={`${
							isScrolled
								? "text-slate-700 dark:text-slate-300"
								: "text-slate-200"
						} hover:text-primary dark:hover:text-primary`}
					>
						About
					</Link>
				</nav>
				<div className="flex items-center gap-3">
					<Link href="/auth/signin">
						<Button
							variant="ghost"
							size="sm"
							className={`${
								isScrolled
									? "text-primary hover:bg-primary/10"
									: "text-white hover:bg-white/20"
							} `}
						>
							Log In
						</Button>
					</Link>
					<Link href="/auth/signup">
						<Button
							size="sm"
							className="bg-primary hover:bg-primary/90 text-white"
						>
							Sign Up
						</Button>
					</Link>
				</div>
			</div>
		</header>
	)
}
