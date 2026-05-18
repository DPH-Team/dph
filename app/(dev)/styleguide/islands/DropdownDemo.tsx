"use client"

import { ChevronDown, User, Settings, HelpCircle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DropdownDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            Menu <ChevronDown aria-hidden="true" className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent>
        <DropdownMenuItem>
          <User aria-hidden="true" className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings aria-hidden="true" className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HelpCircle aria-hidden="true" className="size-4" />
          Help
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut aria-hidden="true" className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
