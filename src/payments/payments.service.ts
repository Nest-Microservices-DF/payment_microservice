import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';
import { metadata } from 'reflect-metadata/no-conflict';

@Injectable()
export class PaymentsService {
    private readonly stripe = new Stripe( envs.stripeSecret );

    createPaymentSession( paymentSessionDto: PaymentSessionDto ) {

        const { currency, items, orderId } = paymentSessionDto;

        const lineItems = items.map( item => {
            return {
                price_data: {
                    currency: currency,
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.round( item.price * 100 ),
                },
                quantity: item.quantity,
            }
        })

        const session = this.stripe.checkout.sessions.create({
            payment_intent_data: {
                metadata: {
                    orderId: orderId
                }
            },
            line_items: lineItems,
            mode: 'payment',
            success_url: envs.stripeSuccessUrl || 'http://localhost:3003/payments/success',
            cancel_url: envs.stripeCancelUrl || 'http://localhost:3003/payments/cancel',
        })

        return session;
    }

    async stripeWebhook( req: Request, res: Response ) {
        
        const sig = req.headers['stripe-signature'];

        if (typeof sig !== 'string') {
            res.status(400).send('Webhook Error: Missing stripe-signature header');
            return;
        }
        
        let event: Stripe.Event;
        const endpointSecret = envs.stripeEndpointSecret;
        
        try {
            event = this.stripe.webhooks.constructEvent(req['rawBody'], sig, endpointSecret);
        } catch (error) {
            res.status(400).send(`Webhook Error: ${error.message}`);
            return;
        }

        switch (event.type) {
            case 'charge.succeeded':
                const chargeSucceded = event.data.object;
                //Llamar al Microservicio de Orders
                console.log( {
                    metadata: chargeSucceded.metadata,
                    orderId: chargeSucceded.metadata?.orderId
                } );
            break;
            default:
                console.log(`Event ${event.type} not handled`);
            break;
        }
        
        return res.status(200).json({ sig } );
    }
}
