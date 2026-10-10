"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AuthCanvas from "../Login/AuthCanvas";
import { TextureButton } from "../ui/texture-button";
import FieldInput from "../Common/Input/FieldInput";
import { CompanyTypeDropdown } from "../Common/Dropdown/CompanyTypeDropdown";
import { CountryDropdown } from "../Common/Dropdown/CountryDropdown";
import { SecondaryButton } from "../Common/SecondaryButton";
import { FileUpload } from "./FileUpload";
import toast from "react-hot-toast";
import { useDemo } from "@/presentation/contexts/DemoProvider";
type Step = "company" | "team" | "complete";
interface OnboardingFormData {
    firstName: string;
    lastName: string;
    companyName: string;
    country: string;
    companyType: string;
    city: string;
    address1: string;
    address2: string;
    postalCode: string;
    registrationNumber: string;
}
function SuccessDots() {
    return (<span className="relative grid h-12 w-12 place-items-center" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
            const x = (Math.cos(a) * 16).toFixed(2);
            const y = (Math.sin(a) * 16).toFixed(2);
            return (<span key={i} className="toast-dot absolute left-1/2 top-1/2 rounded-full" style={{
                    height: 4,
                    width: 4,
                    background: "#21c07a",
                    opacity: 0.85,
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                    animationDelay: `${((-i / 12) * 1.2).toFixed(3)}s`,
                }}/>);
        })}
    </span>);
}
export default function OnboardingContainer() {
    const router = useRouter();
    const reduce = useReducedMotion();
    const { isLoggedIn, isOnboarded, completeOnboarding, data, isLoaded } = useDemo();
    const [step, setStep] = useState<Step>("company");
    const [selectedCompanyType, setSelectedCompanyType] = useState<string>("");
    const [selectedCountry, setSelectedCountry] = useState<string>("");
    const [showAdditionalDetails, setShowAdditionalDetails] = useState<boolean>(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [phase, setPhase] = useState<"form" | "success">("form");
    const [leaving, setLeaving] = useState(false);
    const timers = useRef<number[]>([]);
    const { register, handleSubmit, watch, setValue, formState: { errors }, } = useForm<OnboardingFormData>({
        mode: "onSubmit",
        defaultValues: {
            firstName: "",
            lastName: "",
            companyName: "",
            country: "",
            companyType: "",
            city: "",
            address1: "",
            address2: "",
            postalCode: "",
            registrationNumber: "",
        },
    });
    useEffect(() => {
        if (data) {
            setValue("firstName", data.user.teamMembership?.firstName || "");
            setValue("lastName", data.user.teamMembership?.lastName || "");
            setValue("companyName", data.company.companyName || "");
            setSelectedCountry(data.company.country || "");
        }
    }, [data, setValue]);
    useEffect(() => {
        if (!isLoaded)
            return;
        if (!isLoggedIn) {
            router.replace("/login");
        }
        else if (isOnboarded) {
            router.replace("/");
        }
    }, [isLoggedIn, isOnboarded, isLoaded, router]);
    useEffect(() => () => timers.current.forEach(t => clearTimeout(t)), []);
    useEffect(() => {
        return () => {
            if (previewUrl)
                URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (!["image/jpeg", "image/png"].includes(file.type)) {
            toast.error("Only JPEG and PNG files are allowed");
            return;
        }
        if (previewUrl)
            URL.revokeObjectURL(previewUrl);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        toast.success("Logo uploaded successfully");
        e.target.value = "";
    };
    const onSubmit = (formData: OnboardingFormData) => {
        if (step !== "company" || submitting || phase === "success")
            return;
        setSubmitting(true);
        timers.current.push(window.setTimeout(() => {
            setSubmitting(false);
            setPhase("success");
            timers.current.push(window.setTimeout(() => {
                setLeaving(true);
                timers.current.push(window.setTimeout(() => {
                    completeOnboarding({
                        email: data?.user.email || "demo@example.com",
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        companyName: formData.companyName,
                        country: selectedCountry || "Singapore",
                        industry: data?.company.industry || "Fintech / Crypto Payments",
                        companySize: data?.company.companySize || "1-10",
                    });
                    router.push("/");
                }, 650));
            }, 1700));
        }, 1100));
    };
    const handleBackToLogin = () => {
        try {
            localStorage.removeItem("settlbox_demo_login");
        }
        catch { }
        window.location.href = "/login";
    };
    const renderStep = () => {
        switch (step) {
            case "company":
                return (<div className="flex flex-col gap-4 w-full animate-in fade-in duration-500">
            <h1 className="text-[22px] md:text-[28px] font-medium text-text-primary tracking-tight">
              Tell us about your company
            </h1>

            
            <div className="flex gap-4 items-start w-full">
              <label className={`rounded-full shrink-0 w-[86px] h-[86px] flex items-center justify-center relative overflow-hidden cursor-pointer transition-colors ${previewUrl ? "" : "bg-[#ebf4ff] border border-primary-blue border-dashed hover:bg-blue-50"}`}>
                {previewUrl ? (<img src={previewUrl} alt="Company logo" className="w-full h-full object-cover"/>) : (<img src="/misc/blue-upload-icon.svg" alt="Upload" className="w-6 h-6"/>)}
                <input type="file" accept="image/jpeg,image/png" onChange={handleLogoUpload} className="hidden"/>
              </label>
              <div className="flex flex-col gap-2 flex-1 justify-center min-h-[86px]">
                <div className="flex flex-col gap-0.5">
                  <p className="font-barlow font-medium text-[16px] text-text-primary leading-[24px] tracking-[-0.32px]">
                    Company logo
                  </p>
                  <p className="font-barlow text-[14px] text-text-secondary leading-[20px] tracking-[-0.21px]">
                    Supported formats: JPEG, PNG
                  </p>
                </div>
                <label className="border border-primary-divider rounded-lg px-3 py-1.5 w-fit font-barlow font-medium text-[14px] text-text-primary leading-[20px] tracking-[-0.56px] hover:bg-base-container-sub-background transition-colors cursor-pointer">
                  {previewUrl ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/jpeg,image/png" onChange={handleLogoUpload} className="hidden"/>
                </label>
              </div>
            </div>

            
            <form className="flex flex-col gap-3 w-full" onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex-1">
                  <FieldInput label="First name" placeholder="Enter your first name" size="compact" error={!!errors.firstName} errorMessage={errors.firstName ? "First name is required" : undefined} {...register("firstName", { required: true })}/>
                </div>
                <div className="flex-1">
                  <FieldInput label="Last name" placeholder="Enter your last name" size="compact" error={!!errors.lastName} errorMessage={errors.lastName ? "Last name is required" : undefined} {...register("lastName", { required: true })}/>
                </div>
              </div>

              <FieldInput label="Company name" placeholder="Enter your company name" size="compact" error={!!errors.companyName} errorMessage={errors.companyName ? "Company name is required" : undefined} {...register("companyName", { required: true })}/>

              <div className="flex items-center gap-2 cursor-pointer py-1" onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}>
                <span className="text-text-secondary text-sm">Additional Details</span>
                <img src="/arrow/chevron-down.svg" alt="toggle" className={`w-4 h-4 transition-transform ${showAdditionalDetails ? "rotate-180" : ""}`}/>
              </div>

              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showAdditionalDetails ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"} flex gap-3 flex-col`}>
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Client type</label>
                    <CompanyTypeDropdown selectedCompanyType={selectedCompanyType} onCompanyTypeSelect={value => {
                        setSelectedCompanyType(value);
                        setValue("companyType", value);
                    }} size="compact"/>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Country</label>
                    <CountryDropdown selectedCountry={selectedCountry} onCountrySelect={value => {
                        setSelectedCountry(value);
                        setValue("country", value);
                    }} size="compact"/>
                  </div>
                </div>

                <FieldInput label="City" placeholder="Enter city" size="compact" {...register("city")}/>

                <FieldInput label="Address" placeholder="Enter full address (min 5 characters)" size="compact" error={!!errors.address1} errorMessage={errors.address1?.type === "minLength" ? "Address must be at least 5 characters" : undefined} {...register("address1", { minLength: { value: 5, message: "Address must be at least 5 characters" } })}/>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <div className="w-full sm:w-36">
                    <FieldInput label="Postal code" placeholder="e.g. 70000" size="compact" error={!!errors.postalCode} errorMessage={errors.postalCode?.type === "minLength" ? "Must be at least 3 characters" : undefined} {...register("postalCode", { minLength: { value: 3, message: "Postal code must be at least 3 characters" } })}/>
                  </div>
                  <div className="flex-1">
                    <FieldInput label="Registration number" placeholder="e.g. 8683949 (min 5 chars)" size="compact" error={!!errors.registrationNumber} errorMessage={errors.registrationNumber?.type === "minLength" ? "Must be at least 5 characters" : undefined} {...register("registrationNumber", { minLength: { value: 5, message: "Registration number must be at least 5 characters" } })}/>
                  </div>
                </div>
              </div>
            </form>
          </div>);
            case "team":
                return (<div className="flex flex-col gap-4 md:gap-8 w-full animate-in fade-in duration-500">
            <h1 className="text-[22px] md:text-[32px] font-medium text-text-primary tracking-tight">Add your Team</h1>
            <div className="flex flex-col gap-3 md:gap-4 w-full">
              {Array.from({ length: 3 }).map((_, index) => (<div className="flex flex-col sm:flex-row gap-2 w-full" key={index}>
                  <FieldInput label={`Member ${index + 1}`} placeholder="Enter name" size="compact" {...register("firstName")}/>
                  <FieldInput label="Email" placeholder="@mail" size="compact" {...register("lastName")}/>
                </div>))}
            </div>
            <span className="text-text-secondary text-[14px] md:text-[16px] max-w-[450px]">
              or you can upload a spreadsheet - our AI will automatically fill in your team details for you.
            </span>
            <FileUpload onFileSelect={files => console.log("Files selected:", files)}/>
          </div>);
            case "complete":
                return (<div className="flex justify-center items-center flex-col h-full min-h-[400px] md:min-h-[530px] rounded-3xl border border-primary-divider relative overflow-hidden">
            <div className="absolute inset-0 w-full h-full z-0" style={{ background: "url('/onboarding/complete-background.svg')", backgroundSize: "cover", filter: "blur(12px)" }}/>
            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-4 text-center">
              <img src="/onboarding/hexagon-avatar.svg" alt="Onboarding Complete" className="w-[150px] h-[150px] md:w-[220px] md:h-[220px]"/>
              <span className="font-bold text-xl md:text-2xl">Congratulations</span>
              <span className="text-base md:text-lg text-text-secondary">Your new account is ready to accept payments</span>
              <TextureButton variant="primary" onClick={() => router.push("/")} className="mt-6 w-[180px]">
                Go to app
              </TextureButton>
            </div>
          </div>);
        }
    };
    return (<AuthCanvas converge={phase === "success"}>
      <motion.div layout initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
            layout: { type: "spring", stiffness: 240, damping: 28 },
        }} className={`relative z-30 flex w-full flex-col rounded-[26px] border border-primary-divider/70 bg-[#f1f2f4] p-2.5 shadow-[0_34px_70px_-26px_rgba(20,32,64,0.32)] ${phase === "success" ? "max-w-[340px]" : "max-h-[90dvh] max-w-[480px]"}`}>
        <AnimatePresence mode="wait">
          {phase === "form" ? (<motion.div key="form" exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-primary-divider bg-background px-6 py-6 md:px-7">
              <div className="-mr-2 min-h-0 w-full flex-1 overflow-y-auto pr-2">{renderStep()}</div>

              {step !== "complete" && (<div className="flex w-full flex-shrink-0 items-center justify-between pt-5">
                  {step === "company" ? (<SecondaryButton text="Back to login" variant="light" buttonClassName="w-[124px]" onClick={handleBackToLogin}/>) : (<SecondaryButton text="Go Back" variant="light" buttonClassName="w-[100px]" onClick={() => setStep("company")}/>)}
                  <TextureButton type="button" variant="primary" onClick={handleSubmit(onSubmit)} disabled={submitting} className="w-[150px] disabled:opacity-60">
                    {submitting ? "Creating..." : "Continue"}
                  </TextureButton>
                </div>)}
            </motion.div>) : (<motion.div key="success" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-primary-divider bg-background px-10 py-12 text-center">
              <motion.span initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.12 }}>
                <SuccessDots />
              </motion.span>
              <h2 className="text-[19px] font-semibold text-text-primary">You&apos;re all set</h2>
              <p className="text-[13px] text-text-secondary">Taking you to your dashboard...</p>
            </motion.div>)}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {leaving && (<motion.div key="leave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: "easeInOut" }} className="fixed inset-0 z-[60] bg-app-background" style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}/>)}
      </AnimatePresence>
    </AuthCanvas>);
}
