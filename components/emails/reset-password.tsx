import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface ResetPasswordEmailProps {
  resetUrl: string;
  userEmail: string;
  username: string;
}

const ResetPasswordEmail = ({
  username,
  resetUrl,
  userEmail,
}: ResetPasswordEmailProps) => (
  <Html dir="ltr" lang="en">
    <Tailwind>
      <Head />
      <Preview>Reset your JobMatch password</Preview>
      <Body className="bg-gray-100 py-[40px] font-sans">
        <Container className="mx-auto max-w-[600px] rounded-[8px] bg-white p-[40px]">
          <Text className="mt-0 mb-[4px] font-bold text-[20px] text-gray-900">
            JobMatch
          </Text>

          <Heading className="m-0 mb-[8px] font-bold text-[24px] text-gray-900">
            Reset your password
          </Heading>
          <Text className="m-0 mb-[24px] text-[16px] text-gray-600">
            We received a request for your account: {userEmail}
          </Text>

          <Text className="m-0 mb-[24px] text-[16px] text-gray-700 leading-[24px]">
            Hi {username}, click the button below to create a new password. This
            link expires in 1 hour.
          </Text>

          <Section className="mb-[32px] text-center">
            <Button
              className="box-border inline-block rounded-[6px] bg-gray-900 px-[32px] py-[14px] font-semibold text-[16px] text-white no-underline"
              href={resetUrl}
            >
              Reset Password
            </Button>
          </Section>

          <Text className="m-0 mb-[8px] text-[14px] text-gray-500 leading-[20px]">
            Or copy and paste this link:
          </Text>
          <Link className="break-all text-[14px] text-gray-700" href={resetUrl}>
            {resetUrl}
          </Link>

          <Section className="my-[32px] rounded-[6px] bg-gray-50 p-[20px]">
            <Text className="m-0 mb-[6px] font-semibold text-[13px] text-gray-700">
              Security notice
            </Text>
            <Text className="m-0 text-[13px] text-gray-500 leading-[20px]">
              If you didn&apos;t request this, ignore this email — your password
              won&apos;t change. Never share this link with anyone.
            </Text>
          </Section>

          <Hr className="my-[24px] border-gray-200" />

          <Text className="m-0 text-[12px] text-gray-400 leading-[16px]">
            &copy; {new Date().getFullYear()} JobMatch. This email was sent to{" "}
            {userEmail}.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default ResetPasswordEmail;
