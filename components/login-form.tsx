"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { loginAPI } from "@/lib/api/auth";
import { authHelpers } from "@/lib/api/axiosInstance";
import type { LoginCredentials } from "@/types";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => loginAPI(credentials),
    onSuccess: (data) => {
      // Simpan token dulu
      authHelpers.setToken(data.access_token);

      toast.success("Login berhasil!", {
        description: "Selamat datang kembali.",
      });

      // Gunakan full page navigation agar proxy membaca cookie yang baru di-set.
      // router.push() adalah soft navigation (client-side) — proxy tidak dieksekusi.
      // window.location.href memaksa HTTP request baru ke server.
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.detail || "Username atau password salah";

      toast.error("Login gagal", {
        description: errorMessage,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Field tidak boleh kosong", {
        description: "Silakan isi username dan password",
      });
      return;
    }

    loginMutation.mutate({ username, password });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">SIGN IN</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loginMutation.isPending}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  required
                />
              </Field>
              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Loading..." : "Login"}
                </Button>
                {/* <FieldDescription className="text-center">
                  Forgot your password? <a href="#">Reset</a>
                </FieldDescription> */}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}