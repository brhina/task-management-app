import type { ReactNode } from 'react';

export default function InsightsPanel({
    title,
    subtitle,
    rightSlot,
    children,
}: {
    title: string;
    subtitle?: string;
    rightSlot?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="section-card">
            <div className="section-card-header">
                <div className="min-w-0">
                    <div className="section-card-title">{title}</div>
                    {subtitle ? <div className="section-card-subtitle">{subtitle}</div> : null}
                </div>
                {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
            </div>
            <div className="section-card-body">{children}</div>
        </section>
    );
}

