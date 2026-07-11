import { Container } from "@/../components/ui/container";
import { Button } from "@/../components/ui/button";
import { Input } from "@/../components/ui/input";
import { Textarea } from "@/../components/ui/textarea";
import Typography from "./Typography";

export default function Contact() {
  return (
    <Container>
      <div className="w-full py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="space-y-6">
            <div>
              <Typography variant="h5" as="h1" className="font-bold">
                Get in Touch
              </Typography>
              <p className="text-muted-foreground mt-2">
                Have a question or want to learn more? Fill out the form and
                we'll get back to you as soon as possible.
              </p>
            </div>
            <form className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Input name="name" placeholder="Name" />
                </div>
                <div>
                  <Input name="email" placeholder="Email" type="email" />
                </div>
              </div>
              <div>
                <Textarea
                  placeholder="Message"
                  name="message"
                  rows={4}
                  required
                  maxLength={1000}
                />
              </div>
              {/* <Button type="submit" className="w-full md:w-auto">
              Submit
            </Button> */}
              <Button type="submit">
                Submit
              </Button>
            </form>
          </div>
          <div className="space-y-6">
            <div>
              <h6 className="font-bold">Contact Information</h6>
              <p className="text-muted-foreground mt-2">
                Find us at our office or get in touch through our social media
                channels.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <LocateIcon className="text-primary-text h-6 w-6" />
                <div>
                  <p className="font-medium">Office Address</p>
                  <p className="text-muted-foreground">
                    123 Main Street
                    <br />
                    Anytown, USA 12345
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <PhoneIcon className="text-primary-text h-6 w-6" />
                <div>
                  <p className="font-medium">Phone Number</p>
                  <p className="text-muted-foreground">(123) 456-7890</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

function LocateIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" x2="5" y1="12" y2="12" />
      <line x1="19" x2="22" y1="12" y2="12" />
      <line x1="12" x2="12" y1="2" y2="5" />
      <line x1="12" x2="12" y1="19" y2="22" />
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

function PhoneIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
