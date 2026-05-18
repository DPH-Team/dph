"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Stack } from "@/components/marketing/layout"

export function ToastDemo() {
  return (
    <Stack direction="row" gap={3} wrap>
      <Button
        variant="default"
        onClick={() => toast.success("Pour complete! 8 oz poured from Tap 3.")}
      >
        Success toast
      </Button>
      <Button
        variant="destructive"
        onClick={() =>
          toast.error("Connection lost. Check your RFID reader.")
        }
      >
        Error toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast("New event posted: Trivia Night — Friday 7 PM.")
        }
      >
        Default toast
      </Button>
    </Stack>
  )
}
