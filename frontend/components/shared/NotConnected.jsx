import { ExclamationTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const NotConnected = () => {
  return (
    <Alert variant="destructive">
      <ExclamationTriangle className="h-4 w-4" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        Please connect your Wallet to our DApp.
      </AlertDescription>
    </Alert>
  );
};

export default NotConnected;
