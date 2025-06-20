// src/app/api/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { userId, email, promoCode } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json(
        { error: 'Stripe price ID not configured' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${baseUrl}/dashboard?canceled=true`,
      customer_email: email,
      metadata: {
        firebaseUID: userId,
      },
      allow_promotion_codes: true, // Always allow promotion codes
    };

    // If a specific promo code is provided, validate and apply it
    if (promoCode && promoCode.trim()) {
      try {
        // First, try to find the promotion code
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode.trim(),
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          const promotionCodeObj = promotionCodes.data[0];
          
          // Check if the coupon is valid for subscriptions
          const coupon = await stripe.coupons.retrieve(promotionCodeObj.coupon.id);
          
          if (coupon.applies_to?.products || !coupon.applies_to) {
            // Apply the specific promotion code
            sessionConfig.discounts = [
              {
                promotion_code: promotionCodeObj.id,
              },
            ];
          } else {
            return NextResponse.json(
              { error: 'This promo code is not valid for subscriptions' },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Invalid or expired promo code' },
            { status: 400 }
          );
        }
      } catch (promoError) {
        console.error('Error validating promo code:', promoError);
        return NextResponse.json(
          { error: 'Error validating promo code' },
          { status: 400 }
        );
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
