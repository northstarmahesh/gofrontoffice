import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";

interface PhoneNumbersProps {
  clinicId: string;
}


export const PhoneNumbers = ({ clinicId }: PhoneNumbersProps) => {

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle>Buy Phone Numbers</CardTitle>
          </div>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
        <CardDescription>
          Purchase phone numbers directly from our platform for your business locations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-8">
          This feature will allow you to purchase and manage phone numbers for SMS, voice calls, and WhatsApp directly from the platform.
        </p>
      </CardContent>
    </Card>
  );
};
