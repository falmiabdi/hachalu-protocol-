import Link from "next/link"
import { Scissors } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Scissors className="h-4 w-4" />
      </span>
      <span className={cn("text-lg font-extrabold tracking-tight", dark ? "text-white" : "text-secondary")}>
        Hachalu<span className="text-primary">Protocol</span>
      </span>
    </Link>
  )
}