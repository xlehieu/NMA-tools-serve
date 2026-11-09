export const getOriginalFileName = (file: any) => {
  return Buffer.from(file.originalname, "latin1").toString("utf8");
};
