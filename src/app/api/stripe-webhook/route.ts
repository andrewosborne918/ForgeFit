// src/app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDB } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  console.log('🎯 Webhook received request at:', new Date().toISOString());
  
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('📝 Webhook signature present:', !!signature);

  if (!signature) {
    console.log('❌ Missing Stripe signature');
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    );
  }

  const adminDB = getAdminDB();
  if (!adminDB) {
    console.log('❌ Firebase Admin not configured - check environment variables');
    console.log('   FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
    console.log('   FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
    console.log('   FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY);
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 500 }
    );
  }

  console.log('✅ Firebase Admin SDK initialized successfully');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const firebaseUID = session.metadata?.firebaseUID;

        if (!firebaseUID) {
          console.error('No Firebase UID in session metadata');
          return NextResponse.json({ error: 'Missing Firebase UID' }, { status: 400 });
        }

        // Get the subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        
        // Update user in Firestore with new profile structure
        await adminDB.collection('users').doc(firebaseUID).update({
          'profile.plan': 'premium',
          subscriptionId: subscription.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          customerId: session.customer,
          updatedAt: new Date(),
        });

        console.log(`✅ Successfully updated user ${firebaseUID} to premium plan`);
        console.log(`   Subscription ID: ${subscription.id}`);
        console.log(`   Customer ID: ${session.customer}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const usersQuery = await adminDB
          .collection('users')
          .where('customerId', '==', customerId)
          .limit(1)
          .get();

        if (!usersQuery.empty) {
          const userDoc = usersQuery.docs[0];
          await userDoc.ref.update({
            'profile.plan': subscription.status === 'active' ? 'premium' : 'free',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            updatedAt: new Date(),
          });

          console.log(`Subscription updated for customer ${customerId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const usersQuery = await adminDB
          .collection('users')
          .where('customerId', '==', customerId)
          .limit(1)
          .get();

        if (!usersQuery.empty) {
          const userDoc = usersQuery.docs[0];
          await userDoc.ref.update({
            'profile.plan': 'free',
            updatedAt: new Date(),
          });

          console.log(`Subscription deleted for customer ${customerId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
