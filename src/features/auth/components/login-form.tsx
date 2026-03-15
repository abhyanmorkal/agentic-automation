"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { LoadingSpinnerScreen } from "@/components/loading-spinner-screen";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type SocialProvider = "github" | "google" | null;

export function LoginForm() {
  const router = useRouter();
  const [socialLoading, setSocialLoading] = useState<SocialProvider>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isNavigatingTo, setIsNavigatingTo] = useState<"signup" | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signInGithub = async () => {
    setSocialLoading("github");
    await authClient.signIn.social({
      provider: "github",
    }, {
      onSuccess: () => {
        router.push("/");
      },
      onError: () => {
        toast.error("Something went wrong");
        setSocialLoading(null);
      },
    });
  };

  const signInGoogle = async () => {
    setSocialLoading("google");
    await authClient.signIn.social({
      provider: "google",
    }, {
      onSuccess: () => {
        router.push("/");
      },
      onError: () => {
        toast.error("Something went wrong");
        setSocialLoading(null);
      },
    });
  };

  const onSubmit = async (values: LoginFormValues) => {
    await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: "/",
    }, {
      onSuccess: () => {
        setIsRedirecting(true);
        router.push("/");
      },
      onError: (ctx) => {
        toast.error(ctx.error.message);
      },
    });
  };

  const isPending = form.formState.isSubmitting;
  const anyLoading = isPending || socialLoading !== null || isRedirecting;

  const handleGoToSignup = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsNavigatingTo("signup");
    router.push("/signup");
  };

  if (isNavigatingTo) {
    return <LoadingSpinnerScreen fullScreen />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>
            Welcome back
          </CardTitle>
          <CardDescription>
            Login to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <Button
                    onClick={signInGithub}
                    variant="outline"
                    className="w-full"
                    type="button"
                    disabled={anyLoading}
                  >
                    {socialLoading === "github" ? (
                      <Loader2Icon className="size-5 animate-spin" />
                    ) : (
                      <Image alt="GitHub" src="/logos/github.svg" width={20} height={20} />
                    )}
                    {socialLoading === "github" ? "Signing in..." : "Continue with GitHub"}
                  </Button>
                  <Button
                    onClick={signInGoogle}
                    variant="outline"
                    className="w-full"
                    type="button"
                    disabled={anyLoading}
                  >
                    {socialLoading === "google" ? (
                      <Loader2Icon className="size-5 animate-spin" />
                    ) : (
                      <Image alt="Google" src="/logos/google.svg" width={20} height={20} />
                    )}
                    {socialLoading === "google" ? "Signing in..." : "Continue with Google"}
                  </Button>
                </div>
                <div className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="m@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="*********"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={anyLoading}>
                    {isRedirecting ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : isPending ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a
                    href="/signup"
                    onClick={handleGoToSignup}
                    className="underline underline-offset-4 cursor-pointer"
                  >
                    Sign up
                  </a>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
