import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { accessToken: sessionToken, refreshToken } = req.body.data;
    if (!sessionToken || !refreshToken) {
      return res
        .status(400)
        .json({ message: "Access token and refresh token are required" });
    }
    // Set the cookies
    res.setHeader("Set-Cookie", [
      `sessionToken=${sessionToken}; Path=/; HttpOnly; Secure;`,
      `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure;`,
    ]);

    return res
      .status(200)
      .json({ data: req.body.data, message: "Tokens set successfully" });
  } else if (req.method === "DELETE") {
    // Clear the cookies
    res.setHeader("Set-Cookie", [
      `sessionToken=; Path=/; HttpOnly; Secure; Max-Age=0;`,
      `refreshToken=; Path=/; HttpOnly; Secure; Max-Age=0;`,
    ]);

    return res.status(200).json({ message: "Tokens deleted successfully" });
  } else if (req.method === "GET") {
    // get the cookies
    const refreshToken = req.cookies.refreshToken;

    return res.status(200).json({ refreshToken });
  } else {
    // Handle unsupported methods
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
