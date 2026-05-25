import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Нэвтрэх — MNB OTT" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
