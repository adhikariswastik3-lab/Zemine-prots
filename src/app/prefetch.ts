/** Warms the lazy route chunks for a role so navigation never waits on the network. */
export function prefetchRole(role: "customer" | "merchant") {
  const run = () => {
    void import("@/features/account/Account");
    void import("@/features/activity/ActivityScreen");
    if (role === "customer") {
      void import("@/features/customer/home/CustomerHome");
      void import("@/features/customer/wallet/Wallet");
      void import("@/features/customer/enrollment/Enrollment");
    } else {
      void import("@/features/merchant/home/MerchantHome");
      void import("@/features/merchant/checkout/Checkout");
      void import("@/features/merchant/settlements/Settlements");
    }
  };
  setTimeout(run, 250);
}
