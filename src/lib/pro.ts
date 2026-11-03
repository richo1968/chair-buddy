// Chair Buddy Pro — paid tier with hands-free voice entry.
//
// For now Pro is switched on for everyone (TestFlight). Once the App Store
// in-app purchase exists, hasPro() will check the StoreKit entitlement.
const PRO_KEY = 'chairbuddy:pro';

export function hasPro(): boolean {
  try {
    return window.localStorage.getItem(PRO_KEY) !== 'off';
  } catch {
    return true;
  }
}
