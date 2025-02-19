"use client"

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export default function PinPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex w-full flex-col items-center justify-center space-y-12 px-8 sm:w-[450px]">
        <div className="flex flex-col space-y-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent animate-gradient">Enter PIN</h1>
          <p className="text-lg text-muted-foreground">
            Please enter your 6-digit PIN code
          </p>
        </div>
        <div className="w-full bg-card/50 p-10 rounded-xl shadow-lg backdrop-blur-sm border border-border/50 hover:border-border/80 transition-all duration-300">
          <InputOTP maxLength={6} className="gap-4">
            <InputOTPGroup className="gap-4">
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup className="gap-4">
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>
    </div>
  )
}