import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface VerifyEmailProps {
  username: string;
  verifyUrl: string;
}

const VerifyEmail = ({ username, verifyUrl }: VerifyEmailProps) => (
  <Html dir="ltr" lang="en">
    <Tailwind>
      <Head />
      <Preview>Verify your email to start using JobMatch</Preview>
      <Body className="bg-gray-100 py-[40px] font-sans">
        <Container className="mx-auto max-w-[600px] rounded-[8px] bg-white p-[32px]">
          <Section>
            <Text className="mt-0 mb-[4px] font-bold text-[20px] text-gray-900">
              JobMatch
            </Text>
            <Text className="mt-0 mb-[24px] font-bold text-[24px] text-gray-900">
              Verify your email address
            </Text>

            <Text className="mt-0 mb-[24px] text-[16px] text-gray-700 leading-[24px]">
              Hi {username}, thanks for signing up! Click the button below to
              verify your email and activate your account.
            </Text>

            <Section className="mb-[32px] text-center">
              <Button
                className="box-border rounded-[6px] bg-gray-900 px-[32px] py-[12px] font-medium text-[16px] text-white no-underline"
                href={verifyUrl}
              >
                Verify Email Address
              </Button>
            </Section>

            <Text className="mt-0 mb-[24px] text-[14px] text-gray-500 leading-[20px]">
              If the button doesn&apos;t work, copy and paste this link into
              your browser:
              <br />
              <span className="break-all text-gray-700">{verifyUrl}</span>
            </Text>

            <Text className="mt-0 mb-[32px] text-[14px] text-gray-500 leading-[20px]">
              This link expires in 24 hours. If you didn&apos;t create an
              account, you can safely ignore this email.
            </Text>

            <Hr className="my-[24px] border-gray-200" />

            <Text className="m-0 text-[12px] text-gray-400 leading-[16px]">
              The JobMatch Team &mdash; AI-powered resume matching
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default VerifyEmail;
