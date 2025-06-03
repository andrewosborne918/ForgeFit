"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle"; // Import ThemeToggle

const links = [
	{ href: "/dashboard", label: "Workouts" },
	{ href: "/analytics", label: "Analytics" },
	{ href: "/profile", label: "Profile" },
];

export function Header() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	return (
		<header className="sticky top-0 z-50 border-b bg-white dark:bg-slate-900 dark:border-slate-700">
			<div className="flex items-center justify-between px-4 py-4">
				<Link
					href="/dashboard"
					className="flex items-center text-xl font-bold"
					onClick={() => setIsMobileMenuOpen(false)} // Close menu on logo click
				>
					<span className="text-slate-900 dark:text-slate-50">Forge</span>
					<span className="text-orange-600 dark:text-orange-400">Fit</span>
					<span className="text-slate-900 dark:text-slate-50">.</span>
				</Link>

				{/* Desktop Menu & Theme Toggle */}
				<div className="hidden items-center gap-4 md:flex">
					<nav className="flex gap-4">
						{links.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className={cn(
									"text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
								)}
							>
								{link.label}
							</Link>
						))}
					</nav>
					<ThemeToggle /> {/* Added ThemeToggle for desktop */}
				</div>

				{/* Mobile Menu Button and Toggle */}
				<div className="flex items-center gap-2 md:hidden">
					{/* ThemeToggle can be placed here directly for mobile, or inside the dropdown menu */}
					{/* <ThemeToggle /> */}
					<button
						onClick={toggleMobileMenu}
						className="p-2 rounded-md text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
					>
						{isMobileMenuOpen ? (
							<X className="h-6 w-6" />
						) : (
							<Menu className="h-6 w-6" />
						)}
					</button>
				</div>
			</div>

			{/* Mobile Menu Dropdown */}
			{isMobileMenuOpen && (
				<nav className="md:hidden bg-white dark:bg-slate-900 py-2 border-t dark:border-slate-700">
					<ul className="flex flex-col items-center space-y-2">
						{links.map((link) => (
							<li key={link.href}>
								<Link
									href={link.href}
									className="block w-full px-4 py-2 text-center text-sm font-medium text-muted-foreground hover:text-primary dark:hover:text-orange-400 transition-colors"
									onClick={toggleMobileMenu} // Close menu on link click
								>
									{link.label}
								</Link>
							</li>
						))}
						{/* ThemeToggle for Mobile Menu Dropdown */}
						<li className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 w-full flex justify-center">
							<div className="py-2">
                                <ThemeToggle />
                            </div>
						</li>
					</ul>
				</nav>
			)}
		</header>
	);
}
