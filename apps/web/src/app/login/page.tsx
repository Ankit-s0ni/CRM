import { LoginForm } from "@/components/login-form";
import { publicLinks } from "@/lib/public-links";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-surface">
      {/* Animated Atmospheric Background */}
      <div className="absolute inset-0 -z-10 bg-surface">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-container/10 blur-[120px]"></div>
      </div>
      
      {/* Main Content Container */}
      <main className="w-full max-w-[440px] px-6 py-8 flex flex-col items-center">
        
        {/* Logo & Branding Section */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-on-primary text-[32px]">corporate_fare</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-1">DELTCRM</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">app.deltcrm.com</p>
        </div>

        {/* Modular LoginForm Component */}
        <Suspense>
          <LoginForm />
        </Suspense>

        {/* Secondary Section: Illustrative Visual */}
        <div className="mt-12 w-full grid grid-cols-2 gap-4 opacity-60 hidden md:grid">
          <div className="h-32 rounded-xl bg-surface-container-high relative overflow-hidden">
            <img 
              alt="Office Lobby"
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHI59u55ijnFspyTBi0vWPbe0IGyZtnfvVBaHeximnZYAWBVddBTSLyuAq7tVp2Wz6r1zDQVyr5RxceUuXXIOmdBYvrX83iIuSApXOFvbKlOthGIEesSmJ4iRdSuqnzyiWP4SBq25vTZDdf49399ae69M92W-AA58Vq4FfJrPHduZyh8XXPHeTuLqvHz21rzlsi-_9CrXGd6GmRa4ujRr6-6iOjADIzBsJbUvu977tECMHYoa6Y_8pDBEU-GIajCRf07zd5IRgZg"
            />
          </div>
          <div className="h-32 rounded-xl bg-surface-container-high relative overflow-hidden">
            <img 
              alt="Conference Room"
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBom5TONTOFTUVb2BEfEMk-N16CEx7w9yymGDJy5p0tGtMbCQidzb97DfAFJ42WVWjFXrKKMfvFa6qNnqotxoDcI8jBZyWIpZWcwEFiuoxe7TvLXtX00OUkjmaOYPJZZzqIlLDZA_opk6xqD-P-PNEAWEoQhWj5O2jitoTZsaavi_ZS01Od4VMt2boPxWFipeu8z_JJGSZv3ktacK-89Vk4cBX_5PQ4wcoVf2-Y9qA5dRJAxxt4uagZDJUVNVw4YjijWY92jOf3Lg"
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto pt-12 w-full flex flex-col items-center gap-4">
          <div className="flex gap-6">
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href={publicLinks.privacy}>Privacy Policy</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href={publicLinks.terms}>Terms of Service</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors" href={publicLinks.help}>Help Center</a>
          </div>
          <p className="font-label-sm text-label-sm text-outline">© 2024 DELTCRM. All rights reserved.</p>
        </footer>

      </main>
    </div>
  );
}
