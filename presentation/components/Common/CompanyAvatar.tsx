"use client";
interface CompanyAvatarProps {
    logo?: string | null;
    companyName?: string | null;
    size?: string;
    className?: string;
}
export default function CompanyAvatar({ logo, companyName, size = "w-10", className = "", }: CompanyAvatarProps) {
    if (logo) {
        return (<img src={logo} alt={companyName || "Company"} className={`${size} aspect-square rounded-lg object-cover ${className}`}/>);
    }
    const initial = (companyName || "C").charAt(0).toUpperCase();
    return (<div className={`${size} aspect-square rounded-lg bg-primary-blue flex items-center justify-center text-white font-semibold text-lg ${className}`}>
      {initial}
    </div>);
}
