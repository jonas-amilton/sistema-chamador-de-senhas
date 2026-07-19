import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { show as kioskShow } from '@/routes/kiosk';
import type { Ticket, Unit } from '@/types';

export default function Receipt({
    unit,
    ticket,
}: {
    unit: Unit;
    ticket: Ticket;
}) {
    const issuedAt = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: unit.timezone,
    }).format(new Date(ticket.issued_at));

    return (
        <>
            <Head title={`Comprovante ${ticket.code}`} />
            <main className="receipt-page grid min-h-screen place-items-center bg-slate-100 p-6 text-black">
                <article className="receipt w-full max-w-sm bg-white p-8 shadow-xl">
                    <header className="border-b border-dashed border-black pb-5 text-center">
                        <p className="text-xs font-bold tracking-widest uppercase">
                            Comprovante de senha
                        </p>
                        <h1 className="mt-2 text-xl font-black">{unit.name}</h1>
                    </header>
                    <p className="my-8 text-center font-mono text-6xl font-black">
                        {ticket.code}
                    </p>
                    <dl className="space-y-3 border-y border-dashed border-black py-5 text-sm">
                        <div>
                            <dt className="text-xs uppercase">Serviço</dt>
                            <dd className="font-bold">{ticket.service.name}</dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase">Atendimento</dt>
                            <dd className="font-bold">
                                {ticket.priority_label}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase">Emissão</dt>
                            <dd className="font-bold">{issuedAt}</dd>
                        </div>
                    </dl>
                    <p className="mt-6 text-center text-sm font-semibold">
                        Aguarde a chamada no painel.
                    </p>
                    <div className="print-hidden mt-8 grid gap-3">
                        <Button
                            onClick={() => window.print()}
                            className="min-h-12"
                        >
                            <Printer className="mr-2 size-5" aria-hidden />{' '}
                            Imprimir
                        </Button>
                        <Link
                            href={kioskShow(unit)}
                            className="inline-flex min-h-12 items-center justify-center rounded-md border font-bold"
                        >
                            <ArrowLeft className="mr-2 size-5" aria-hidden />{' '}
                            Nova senha
                        </Link>
                    </div>
                </article>
            </main>
        </>
    );
}
