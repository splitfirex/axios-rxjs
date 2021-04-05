import { AxiosRx } from "./index";

it("should get information form service", (done) => {
  AxiosRx.get<string>("https://reqres.in/api/users").subscribe((res) => {
    expect(res.status).toBe(200);
    expect(res.data).not.toBe(undefined);
    done();
  });
});

it("should failed register", (done) => {
  AxiosRx.post<string>("https://reqres.in/api/register", {
    email: "sydney@fife",
  }).subscribe(
    (res) => {
      expect(res.status).toBe(400);
      done();
    },
    (error) => {
      expect(error.response.status).toBe(400);
      done();
    }
  );
});
