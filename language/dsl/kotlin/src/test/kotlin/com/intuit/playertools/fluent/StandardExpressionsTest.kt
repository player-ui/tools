package com.intuit.playertools.fluent

import com.intuit.playertools.fluent.tagged.*
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe

class StandardExpressionsTest :
    DescribeSpec({

        describe("Logical operations") {
            describe("and()") {
                it("combines two boolean values") {
                    and(true, false).toString() shouldBe "@[true && false]@"
                }

                it("combines bindings") {
                    val user = binding<Boolean>("user.isActive")
                    val admin = binding<Boolean>("user.isAdmin")
                    and(user, admin).toString() shouldBe "@[user.isActive && user.isAdmin]@"
                }

                it("wraps OR expressions in parentheses") {
                    val a = binding<Boolean>("a")
                    val b = binding<Boolean>("b")
                    val c = binding<Boolean>("c")
                    // (a || b) && c should be wrapped
                    and(or(a, b), c).toString() shouldBe "@[(a || b) && c]@"
                }

                it("combines multiple values") {
                    val a = binding<Boolean>("a")
                    val b = binding<Boolean>("b")
                    val c = binding<Boolean>("c")
                    and(a, b, c).toString() shouldBe "@[a && b && c]@"
                }
            }

            describe("or()") {
                it("combines two boolean values") {
                    or(true, false).toString() shouldBe "@[true || false]@"
                }

                it("combines bindings") {
                    val a = binding<Boolean>("hasPermission")
                    val b = binding<Boolean>("isAdmin")
                    or(a, b).toString() shouldBe "@[hasPermission || isAdmin]@"
                }

                it("combines multiple values") {
                    val a = binding<Boolean>("a")
                    val b = binding<Boolean>("b")
                    val c = binding<Boolean>("c")
                    or(a, b, c).toString() shouldBe "@[a || b || c]@"
                }
            }

            describe("not()") {
                it("negates a boolean") {
                    not(true).toString() shouldBe "@[!true]@"
                }

                it("negates a binding") {
                    val active = binding<Boolean>("user.isActive")
                    not(active).toString() shouldBe "@[!user.isActive]@"
                }
            }

            describe("nor()") {
                it("returns NOT of OR") {
                    val a = binding<Boolean>("a")
                    val b = binding<Boolean>("b")
                    nor(a, b).toString() shouldBe "@[!(a || b)]@"
                }
            }

            describe("nand()") {
                it("returns NOT of AND") {
                    val a = binding<Boolean>("a")
                    val b = binding<Boolean>("b")
                    nand(a, b).toString() shouldBe "@[!(a && b)]@"
                }
            }

            describe("xor()") {
                it("returns exclusive or") {
                    val a = binding<Boolean>("a")
                    val b = binding<Boolean>("b")
                    xor(a, b).toString() shouldBe "@[(a && !b) || (!a && b)]@"
                }
            }
        }

        describe("Comparison operations") {
            describe("equal()") {
                it("compares binding with literal") {
                    val status = binding<String>("order.status")
                    equal(status, "completed").toString() shouldBe "@[order.status == \"completed\"]@"
                }

                it("compares binding with number") {
                    val count = binding<Int>("items.count")
                    equal(count, 0).toString() shouldBe "@[items.count == 0]@"
                }

                it("compares two bindings") {
                    val a = binding<String>("a")
                    val b = binding<String>("b")
                    equal(a, b).toString() shouldBe "@[a == b]@"
                }
            }

            describe("strictEqual()") {
                it("uses === operator") {
                    val status = binding<String>("status")
                    strictEqual(status, "active").toString() shouldBe "@[status === \"active\"]@"
                }
            }

            describe("notEqual()") {
                it("uses != operator") {
                    val status = binding<String>("status")
                    notEqual(status, "inactive").toString() shouldBe "@[status != \"inactive\"]@"
                }
            }

            describe("strictNotEqual()") {
                it("uses !== operator") {
                    val status = binding<String>("status")
                    strictNotEqual(status, "disabled").toString() shouldBe "@[status !== \"disabled\"]@"
                }
            }

            describe("greaterThan()") {
                it("compares numbers") {
                    val age = binding<Int>("user.age")
                    greaterThan(age, 18).toString() shouldBe "@[user.age > 18]@"
                }
            }

            describe("greaterThanOrEqual()") {
                it("compares numbers") {
                    val score = binding<Int>("score")
                    greaterThanOrEqual(score, 70).toString() shouldBe "@[score >= 70]@"
                }
            }

            describe("lessThan()") {
                it("compares numbers") {
                    val quantity = binding<Int>("cart.quantity")
                    lessThan(quantity, 10).toString() shouldBe "@[cart.quantity < 10]@"
                }
            }

            describe("lessThanOrEqual()") {
                it("compares numbers") {
                    val price = binding<Double>("item.price")
                    lessThanOrEqual(price, 99.99).toString() shouldBe "@[item.price <= 99.99]@"
                }
            }
        }

        describe("Arithmetic operations") {
            describe("add()") {
                it("adds numbers") {
                    add(5, 3).toString() shouldBe "@[5 + 3]@"
                }

                it("adds bindings") {
                    val subtotal = binding<Double>("cart.subtotal")
                    val tax = binding<Double>("cart.tax")
                    add(subtotal, tax).toString() shouldBe "@[cart.subtotal + cart.tax]@"
                }

                it("adds multiple values") {
                    val a = binding<Int>("a")
                    val b = binding<Int>("b")
                    val c = binding<Int>("c")
                    add(a, b, c).toString() shouldBe "@[a + b + c]@"
                }
            }

            describe("subtract()") {
                it("subtracts numbers") {
                    val total = binding<Double>("total")
                    subtract(total, 10.0).toString() shouldBe "@[total - 10.0]@"
                }
            }

            describe("multiply()") {
                it("multiplies numbers") {
                    val price = binding<Double>("price")
                    val quantity = binding<Int>("quantity")
                    multiply(price, quantity).toString() shouldBe "@[price * quantity]@"
                }

                it("multiplies multiple values") {
                    multiply(2, 3, 4).toString() shouldBe "@[2 * 3 * 4]@"
                }
            }

            describe("divide()") {
                it("divides numbers") {
                    val total = binding<Double>("total")
                    divide(total, 2).toString() shouldBe "@[total / 2]@"
                }
            }

            describe("modulo()") {
                it("computes modulo") {
                    val index = binding<Int>("index")
                    modulo(index, 2).toString() shouldBe "@[index % 2]@"
                }
            }
        }

        describe("Control flow operations") {
            describe("conditional()") {
                it("creates ternary expression") {
                    val isPremium = binding<Boolean>("user.isPremium")
                    conditional(isPremium, "Premium User", "Free User")
                        .toString() shouldBe "@[user.isPremium ? \"Premium User\" : \"Free User\"]@"
                }

                it("works with nested expressions") {
                    val count = binding<Int>("count")
                    val isZero = equal(count, 0)
                    conditional(isZero, "Empty", "Has items")
                        .toString() shouldBe "@[count == 0 ? \"Empty\" : \"Has items\"]@"
                }

                it("works with numeric values") {
                    val hasDiscount = binding<Boolean>("hasDiscount")
                    conditional(hasDiscount, 0.10, 0.0)
                        .toString() shouldBe "@[hasDiscount ? 0.1 : 0.0]@"
                }
            }

            describe("call()") {
                it("creates function call") {
                    call<Unit>("navigate", "home")
                        .toString() shouldBe "@[navigate(\"home\")]@"
                }

                it("creates function call with multiple args") {
                    val userId = binding<String>("user.id")
                    call<Unit>("setUser", userId, true)
                        .toString() shouldBe "@[setUser(user.id, true)]@"
                }

                it("creates function call with no args") {
                    call<Unit>("refresh")
                        .toString() shouldBe "@[refresh()]@"
                }
            }

            describe("literal()") {
                it("creates string literal") {
                    literal("hello").toString() shouldBe "@[\"hello\"]@"
                }

                it("creates number literal") {
                    literal(42).toString() shouldBe "@[42]@"
                }

                it("creates boolean literal") {
                    literal(true).toString() shouldBe "@[true]@"
                }
            }
        }

        describe("Complex expressions") {
            it("composes logical and comparison operations") {
                val age = binding<Int>("user.age")
                val hasPermission = binding<Boolean>("user.hasPermission")

                val expr =
                    and(
                        greaterThanOrEqual(age, 18),
                        hasPermission
                    )
                expr.toString() shouldBe "@[user.age >= 18 && user.hasPermission]@"
            }

            it("composes arithmetic and comparison") {
                val price = binding<Double>("item.price")
                val quantity = binding<Int>("item.quantity")
                val budget = binding<Double>("budget")

                val total = multiply(price, quantity)
                val withinBudget = lessThanOrEqual(total, budget)

                withinBudget.toString() shouldBe "@[item.price * item.quantity <= budget]@"
            }

            it("composes conditional with comparison") {
                val score = binding<Int>("score")
                val isPassing = greaterThanOrEqual(score, 70)

                conditional(isPassing, "Pass", "Fail")
                    .toString() shouldBe "@[score >= 70 ? \"Pass\" : \"Fail\"]@"
            }
        }

        describe("Aliases") {
            it("eq is alias for equal") {
                val x = binding<Int>("x")
                eq(x, 5).toString() shouldBe "@[x == 5]@"
            }

            it("gt is alias for greaterThan") {
                val x = binding<Int>("x")
                gt(x, 5).toString() shouldBe "@[x > 5]@"
            }

            it("lt is alias for lessThan") {
                val x = binding<Int>("x")
                lt(x, 5).toString() shouldBe "@[x < 5]@"
            }

            it("gte is alias for greaterThanOrEqual") {
                val x = binding<Int>("x")
                gte(x, 5).toString() shouldBe "@[x >= 5]@"
            }

            it("lte is alias for lessThanOrEqual") {
                val x = binding<Int>("x")
                lte(x, 5).toString() shouldBe "@[x <= 5]@"
            }

            it("plus is alias for add") {
                val a = binding<Int>("a")
                val b = binding<Int>("b")
                plus(a, b).toString() shouldBe "@[a + b]@"
            }

            it("minus is alias for subtract") {
                val a = binding<Int>("a")
                val b = binding<Int>("b")
                minus(a, b).toString() shouldBe "@[a - b]@"
            }

            it("times is alias for multiply") {
                val a = binding<Int>("a")
                val b = binding<Int>("b")
                times(a, b).toString() shouldBe "@[a * b]@"
            }
        }
    })
